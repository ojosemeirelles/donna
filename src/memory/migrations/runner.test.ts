import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MigrationRunner } from "./runner.js";
import type { Migration, SchemaVersionRow } from "./types.js";

function openInMemoryDb(): DatabaseSync {
  return new DatabaseSync(":memory:");
}

// ---------------------------------------------------------------------------
// Test migrations
// ---------------------------------------------------------------------------

const testMigrationV1: Migration = {
  version: 1,
  description: "create users table",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
  },
};

const testMigrationV2: Migration = {
  version: 2,
  description: "add email column to users",
  up(db) {
    // Idempotent: check if column already exists before adding.
    const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "email")) {
      db.exec("ALTER TABLE users ADD COLUMN email TEXT");
    }
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MigrationRunner", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openInMemoryDb();
  });

  afterEach(() => {
    db.close();
  });

  // -------------------------------------------------------------------------
  // schema_version table creation
  // -------------------------------------------------------------------------

  it("creates schema_version table on fresh database", () => {
    const runner = new MigrationRunner(db, []);
    runner.ensureSchemaVersion();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .all() as Array<{ name: string }>;
    expect(tables).toHaveLength(1);
  });

  it("ensureSchemaVersion is idempotent", () => {
    const runner = new MigrationRunner(db, []);
    runner.ensureSchemaVersion();
    runner.ensureSchemaVersion(); // should not throw
  });

  // -------------------------------------------------------------------------
  // getCurrentVersion
  // -------------------------------------------------------------------------

  it("returns 0 when no migrations have been applied", () => {
    const runner = new MigrationRunner(db, [testMigrationV1]);
    expect(runner.getCurrentVersion()).toBe(0);
  });

  // -------------------------------------------------------------------------
  // getPendingMigrations
  // -------------------------------------------------------------------------

  it("returns all migrations as pending on fresh database", () => {
    const runner = new MigrationRunner(db, [testMigrationV1, testMigrationV2]);
    const pending = runner.getPendingMigrations();
    expect(pending).toHaveLength(2);
    expect(pending[0].version).toBe(1);
    expect(pending[1].version).toBe(2);
  });

  // -------------------------------------------------------------------------
  // runMigrations
  // -------------------------------------------------------------------------

  it("runs pending migrations in order", () => {
    const runner = new MigrationRunner(db, [testMigrationV1, testMigrationV2]);
    const applied = runner.runMigrations();
    expect(applied).toBe(2);

    // users table should exist with email column
    const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("name");
    expect(colNames).toContain("email");
  });

  it("records applied migrations with timestamp", () => {
    const runner = new MigrationRunner(db, [testMigrationV1]);
    runner.runMigrations();

    const rows = runner.getAppliedMigrations();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.version).toBe(1);
    expect(row.description).toBe("create users table");
    // applied_at should be a valid ISO date string
    expect(new Date(row.applied_at).getTime()).toBeGreaterThan(0);
  });

  it("is idempotent — re-running skips already applied migrations", () => {
    const runner = new MigrationRunner(db, [testMigrationV1, testMigrationV2]);

    const first = runner.runMigrations();
    expect(first).toBe(2);

    const second = runner.runMigrations();
    expect(second).toBe(0);

    // schema_version should still have exactly 2 rows
    const rows = runner.getAppliedMigrations();
    expect(rows).toHaveLength(2);
  });

  it("applies only new migrations when some are already applied", () => {
    // Apply v1 first
    const runner1 = new MigrationRunner(db, [testMigrationV1]);
    runner1.runMigrations();
    expect(runner1.getCurrentVersion()).toBe(1);

    // Now add v2 and run again
    const runner2 = new MigrationRunner(db, [testMigrationV1, testMigrationV2]);
    const applied = runner2.runMigrations();
    expect(applied).toBe(1);
    expect(runner2.getCurrentVersion()).toBe(2);
  });

  it("rolls back on migration failure without partial state", () => {
    const badMigration: Migration = {
      version: 2,
      description: "deliberately broken",
      up() {
        throw new Error("intentional test failure");
      },
    };

    const runner = new MigrationRunner(db, [testMigrationV1, badMigration]);

    // v1 succeeds, v2 fails
    expect(() => runner.runMigrations()).toThrow("intentional test failure");

    // v1 should have been recorded; v2 should NOT
    expect(runner.getCurrentVersion()).toBe(1);
    const rows = runner.getAppliedMigrations();
    expect(rows).toHaveLength(1);
  });

  it("returns 0 when there are no migrations at all", () => {
    const runner = new MigrationRunner(db, []);
    const applied = runner.runMigrations();
    expect(applied).toBe(0);
  });
});

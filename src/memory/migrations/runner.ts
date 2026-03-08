import type { DatabaseSync } from "node:sqlite";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { Migration, SchemaVersionRow } from "./types.js";

const log = createSubsystemLogger("migrations");

const SCHEMA_VERSION_DDL = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
`;

/**
 * Versioned schema migration runner for the embedded SQLite database.
 *
 * Keeps a `schema_version` table that records which migrations have been
 * applied. Migrations are executed inside individual transactions so a
 * failure in one migration does not leave partially-applied state.
 */
export class MigrationRunner {
  private readonly db: DatabaseSync;
  private readonly migrations: Migration[];

  constructor(db: DatabaseSync, migrations: Migration[]) {
    this.db = db;
    this.migrations = migrations;
  }

  /** Ensure the `schema_version` tracking table exists. */
  ensureSchemaVersion(): void {
    this.db.exec(SCHEMA_VERSION_DDL);
  }

  /** Return the highest version number that has been applied, or 0 if none. */
  getCurrentVersion(): number {
    this.ensureSchemaVersion();
    const row = this.db
      .prepare("SELECT MAX(version) AS v FROM schema_version")
      .get() as unknown as { v: number | null } | undefined;
    return row?.v ?? 0;
  }

  /** Return all version rows ordered by version. */
  getAppliedMigrations(): SchemaVersionRow[] {
    this.ensureSchemaVersion();
    return this.db
      .prepare("SELECT version, description, applied_at FROM schema_version ORDER BY version")
      .all() as unknown as SchemaVersionRow[];
  }

  /** Return migrations that have not yet been applied. */
  getPendingMigrations(): Migration[] {
    const current = this.getCurrentVersion();
    return this.migrations.filter((m) => m.version > current);
  }

  /**
   * Apply all pending migrations in order. Each migration runs inside its
   * own transaction so the database stays consistent even if a later
   * migration fails.
   *
   * @returns The number of migrations that were applied.
   */
  runMigrations(): number {
    const pending = this.getPendingMigrations();
    if (pending.length === 0) {
      return 0;
    }

    log.info(`${pending.length} pending migration(s) to apply`);

    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)",
    );

    let applied = 0;
    for (const migration of pending) {
      log.info(`applying v${String(migration.version).padStart(3, "0")}: ${migration.description}`);

      // Run the DDL/DML inside a transaction so it is atomic.
      this.db.exec("BEGIN");
      try {
        migration.up(this.db);
        insert.run(migration.version, migration.description, new Date().toISOString());
        this.db.exec("COMMIT");
        applied++;
      } catch (err) {
        this.db.exec("ROLLBACK");
        const message = err instanceof Error ? err.message : String(err);
        log.error(`migration v${String(migration.version).padStart(3, "0")} failed: ${message}`);
        throw err;
      }
    }

    log.info(`${applied} migration(s) applied successfully`);
    return applied;
  }
}

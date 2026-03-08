import type { Migration } from "./types.js";

/**
 * Baseline migration: documents the current schema as of the initial migration
 * system introduction. All statements use `CREATE TABLE IF NOT EXISTS` /
 * `CREATE INDEX IF NOT EXISTS` so the migration is a no-op on databases that
 * already have these objects.
 *
 * This does NOT create FTS virtual tables or dynamic-name tables
 * (embedding_cache, chunks_fts) because those are managed by
 * `ensureMemoryIndexSchema` with runtime parameters.
 */
export const v001Baseline: Migration = {
  version: 1,
  description: "Baseline schema: meta, files, chunks tables and core indexes",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        source TEXT NOT NULL DEFAULT 'memory',
        hash TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'memory',
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        hash TEXT NOT NULL,
        model TEXT NOT NULL,
        text TEXT NOT NULL,
        embedding TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);`);
  },
};

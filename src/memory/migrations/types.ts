import type { DatabaseSync } from "node:sqlite";

/** A single versioned schema migration. */
export interface Migration {
  /** Monotonically increasing version number (1, 2, 3, ...). */
  version: number;
  /** Short human-readable description of what this migration does. */
  description: string;
  /** Apply the migration. Must be idempotent (safe to re-run). */
  up: (db: DatabaseSync) => void;
}

/** Row stored in the `schema_version` table. */
export interface SchemaVersionRow {
  version: number;
  description: string;
  applied_at: string;
}

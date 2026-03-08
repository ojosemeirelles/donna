/**
 * sqlite-vec backed vector search engine.
 *
 * Wraps the existing sqlite-vec extension calls used by the memory index.
 * `isAvailable()` returns true only after the extension has been loaded
 * successfully.
 */

import type { DatabaseSync } from "node:sqlite";

import { loadSqliteVecExtension } from "./sqlite-vec.js";
import type { SearchResult, VectorSearchEngine } from "./vector-search.js";

const vectorToBlob = (embedding: number[] | Float32Array): Buffer =>
  Buffer.from(
    embedding instanceof Float32Array
      ? embedding.buffer
      : new Float32Array(embedding).buffer,
  );

export class SqliteVecSearch implements VectorSearchEngine {
  readonly name = "sqlite-vec";
  private available = false;
  private loadError?: string;

  constructor(
    private readonly db: DatabaseSync,
    private readonly tableName: string,
    private readonly extensionPath?: string,
  ) {}

  /**
   * Attempt to load the sqlite-vec extension. Must be called before
   * `search`/`insert`/`delete`. Safe to call multiple times -- only the
   * first call has an effect.
   */
  async load(): Promise<{ ok: boolean; error?: string }> {
    if (this.available) {
      return { ok: true };
    }
    const result = await loadSqliteVecExtension({
      db: this.db,
      extensionPath: this.extensionPath,
    });
    this.available = result.ok;
    this.loadError = result.error;
    return result;
  }

  isAvailable(): boolean {
    return this.available;
  }

  getLoadError(): string | undefined {
    return this.loadError;
  }

  /**
   * Ensure the virtual vec0 table exists for the given dimensions.
   * Safe to call multiple times with the same value.
   */
  ensureTable(dimensions: number): void {
    this.db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING vec0(\n` +
        `  id TEXT PRIMARY KEY,\n` +
        `  embedding FLOAT[${dimensions}]\n` +
        `)`,
    );
  }

  async search(query: Float32Array | number[], topK: number): Promise<SearchResult[]> {
    if (!this.available || topK <= 0 || query.length === 0) {
      return [];
    }
    const rows = this.db
      .prepare(
        `SELECT id, vec_distance_cosine(embedding, ?) AS dist\n` +
          `  FROM ${this.tableName}\n` +
          ` ORDER BY dist ASC\n` +
          ` LIMIT ?`,
      )
      .all(vectorToBlob(query), topK) as Array<{ id: string; dist: number }>;

    return rows.map((row) => ({ id: row.id, distance: row.dist }));
  }

  async insert(id: string, vector: Float32Array | number[]): Promise<void> {
    if (!this.available) {
      return;
    }
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ${this.tableName} (id, embedding) VALUES (?, ?)`,
      )
      .run(id, vectorToBlob(vector));
  }

  async delete(id: string): Promise<void> {
    if (!this.available) {
      return;
    }
    this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .run(id);
  }
}

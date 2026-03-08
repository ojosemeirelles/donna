/**
 * Factory that auto-detects sqlite-vec availability and returns the
 * appropriate VectorSearchEngine implementation.
 */

import type { DatabaseSync } from "node:sqlite";

import { createSubsystemLogger } from "../logging/subsystem.js";
import { BruteForceSearch } from "./vector-search-brute.js";
import { SqliteVecSearch } from "./vector-search-native.js";
import type { VectorSearchEngine } from "./vector-search.js";

const log = createSubsystemLogger("memory");

export interface VectorSearchFactoryOptions {
  db: DatabaseSync;
  tableName: string;
  extensionPath?: string;
}

/**
 * Create a VectorSearchEngine. Tries sqlite-vec first; falls back to
 * brute-force cosine similarity if the extension cannot be loaded.
 */
export async function createVectorSearchEngine(
  opts: VectorSearchFactoryOptions,
): Promise<VectorSearchEngine> {
  const native = new SqliteVecSearch(opts.db, opts.tableName, opts.extensionPath);
  const loadResult = await native.load();

  if (loadResult.ok) {
    log.info("vector search: using sqlite-vec (native)");
    return native;
  }

  log.warn(
    `vector search: sqlite-vec unavailable (${loadResult.error ?? "unknown error"}); ` +
      `falling back to brute-force cosine similarity`,
  );
  return new BruteForceSearch();
}

/**
 * Synchronous variant that skips the load attempt and returns a
 * BruteForceSearch directly. Useful in contexts where async init
 * is not possible.
 */
export function createBruteForceSearchEngine(): BruteForceSearch {
  log.warn(
    "vector search: using brute-force cosine similarity fallback " +
      "(sqlite-vec not attempted)",
  );
  return new BruteForceSearch();
}

/**
 * Abstract interface for vector search engines.
 *
 * Allows swapping between sqlite-vec (native) and a brute-force JS fallback
 * without changing the rest of the memory system.
 */

export interface SearchResult {
  id: string;
  distance: number;
}

export interface VectorSearchEngine {
  /** Find the topK nearest vectors to the query. Returns results sorted by distance (ascending). */
  search(query: Float32Array | number[], topK: number): Promise<SearchResult[]>;

  /** Insert a vector with an associated ID. Replaces existing entry if ID already exists. */
  insert(id: string, vector: Float32Array | number[]): Promise<void>;

  /** Delete a vector by ID. No-op if ID does not exist. */
  delete(id: string): Promise<void>;

  /** Whether this engine is available and functional. */
  isAvailable(): boolean;

  /** Human-readable name for logging. */
  readonly name: string;
}

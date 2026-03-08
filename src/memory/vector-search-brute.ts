/**
 * Brute-force vector search using pure JavaScript cosine similarity.
 *
 * This is the fallback when sqlite-vec is unavailable. It keeps all vectors
 * in memory and scans them linearly on each search. Acceptable performance
 * for fewer than ~10,000 vectors.
 */

import { createSubsystemLogger } from "../logging/subsystem.js";
import { cosineSimilarity } from "./internal.js";
import type { SearchResult, VectorSearchEngine } from "./vector-search.js";

const log = createSubsystemLogger("memory");

const PERFORMANCE_WARNING_THRESHOLD = 10_000;

export class BruteForceSearch implements VectorSearchEngine {
  readonly name = "brute-force";
  private readonly vectors = new Map<string, number[]>();
  private warningLogged = false;

  isAvailable(): boolean {
    // Always available -- pure JS, no native dependencies.
    return true;
  }

  async search(query: Float32Array | number[], topK: number): Promise<SearchResult[]> {
    if (topK <= 0 || query.length === 0 || this.vectors.size === 0) {
      return [];
    }

    const queryArr = query instanceof Float32Array ? Array.from(query) : query;
    const scored: SearchResult[] = [];

    for (const [id, vector] of this.vectors) {
      const similarity = cosineSimilarity(queryArr, vector);
      if (!Number.isFinite(similarity)) {
        continue;
      }
      // Convert cosine similarity (1 = identical) to distance (0 = identical)
      // to match sqlite-vec's vec_distance_cosine output.
      scored.push({ id, distance: 1 - similarity });
    }

    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, topK);
  }

  async insert(id: string, vector: Float32Array | number[]): Promise<void> {
    const arr = vector instanceof Float32Array ? Array.from(vector) : vector;
    this.vectors.set(id, arr);

    if (!this.warningLogged && this.vectors.size >= PERFORMANCE_WARNING_THRESHOLD) {
      log.warn(
        `brute-force vector search: ${this.vectors.size} vectors loaded. ` +
          `Performance may degrade. Consider installing sqlite-vec for native search.`,
      );
      this.warningLogged = true;
    }
  }

  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  /** Current number of stored vectors. Useful for diagnostics. */
  get size(): number {
    return this.vectors.size;
  }

  /** Remove all stored vectors and reset state. */
  clear(): void {
    this.vectors.clear();
    this.warningLogged = false;
  }
}

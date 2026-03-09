import { describe, expect, it } from "vitest";
import { BruteForceSearch } from "./vector-search-brute.js";

// Normalised vectors for deterministic cosine similarity tests.
function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

describe("BruteForceSearch", () => {
  it("isAvailable always returns true", () => {
    const engine = new BruteForceSearch();
    expect(engine.isAvailable()).toBe(true);
  });

  it("search returns empty when no vectors are stored", async () => {
    const engine = new BruteForceSearch();
    const results = await engine.search([1, 0, 0], 5);
    expect(results).toEqual([]);
  });

  it("search returns empty for zero topK", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", [1, 0, 0]);
    const results = await engine.search([1, 0, 0], 0);
    expect(results).toEqual([]);
  });

  it("search returns empty for empty query", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", [1, 0, 0]);
    const results = await engine.search([], 5);
    expect(results).toEqual([]);
  });

  it("finds the closest vector by cosine distance", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("exact", normalize([1, 0, 0]));
    await engine.insert("close", normalize([0.9, 0.1, 0]));
    await engine.insert("far", normalize([0, 0, 1]));

    const results = await engine.search(normalize([1, 0, 0]), 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("exact");
    expect(results[0].distance).toBeCloseTo(0, 5);
    expect(results[1].id).toBe("close");
  });

  it("returns correct ordering for multiple close vectors", async () => {
    const engine = new BruteForceSearch();
    const base = normalize([1, 1, 0]);
    await engine.insert("a", normalize([1, 1, 0.01]));
    await engine.insert("b", normalize([1, 1, 0.5]));
    await engine.insert("c", normalize([0, 0, 1]));

    const results = await engine.search(base, 3);
    expect(results).toHaveLength(3);
    // "a" is closest, then "b", then "c"
    expect(results[0].id).toBe("a");
    expect(results[1].id).toBe("b");
    expect(results[2].id).toBe("c");
    // Distances should be in ascending order
    expect(results[0].distance).toBeLessThan(results[1].distance);
    expect(results[1].distance).toBeLessThan(results[2].distance);
  });

  it("handles Float32Array input", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", new Float32Array([1, 0, 0]));
    const results = await engine.search(new Float32Array([1, 0, 0]), 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a");
    expect(results[0].distance).toBeCloseTo(0, 5);
  });

  it("insert replaces existing vector with same ID", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", normalize([1, 0, 0]));
    await engine.insert("a", normalize([0, 1, 0]));
    expect(engine.size).toBe(1);

    const results = await engine.search(normalize([0, 1, 0]), 1);
    expect(results[0].id).toBe("a");
    expect(results[0].distance).toBeCloseTo(0, 5);
  });

  it("delete removes a vector", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", [1, 0, 0]);
    await engine.insert("b", [0, 1, 0]);
    expect(engine.size).toBe(2);

    await engine.delete("a");
    expect(engine.size).toBe(1);

    const results = await engine.search([1, 0, 0], 5);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("b");
  });

  it("delete is a no-op for non-existent ID", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", [1, 0, 0]);
    await engine.delete("non-existent");
    expect(engine.size).toBe(1);
  });

  it("clear removes all vectors", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("a", [1, 0, 0]);
    await engine.insert("b", [0, 1, 0]);
    engine.clear();
    expect(engine.size).toBe(0);

    const results = await engine.search([1, 0, 0], 5);
    expect(results).toEqual([]);
  });

  it("cosine similarity accuracy: orthogonal vectors have distance ~1", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("ortho", normalize([0, 1, 0]));
    const results = await engine.search(normalize([1, 0, 0]), 1);
    expect(results[0].distance).toBeCloseTo(1, 5);
  });

  it("cosine similarity accuracy: opposite vectors have distance ~2", async () => {
    const engine = new BruteForceSearch();
    await engine.insert("opposite", normalize([-1, 0, 0]));
    const results = await engine.search(normalize([1, 0, 0]), 1);
    expect(results[0].distance).toBeCloseTo(2, 5);
  });

  it("topK limits output length", async () => {
    const engine = new BruteForceSearch();
    for (let i = 0; i < 20; i++) {
      const v = new Array(3).fill(0);
      v[i % 3] = 1;
      await engine.insert(`v${i}`, v);
    }
    const results = await engine.search([1, 0, 0], 3);
    expect(results).toHaveLength(3);
  });

  it("handles high-dimensional vectors", async () => {
    const dims = 1536; // typical OpenAI embedding dimension
    const engine = new BruteForceSearch();

    const v1 = new Array(dims).fill(0).map((_, i) => Math.sin(i));
    const v2 = new Array(dims).fill(0).map((_, i) => Math.cos(i));
    const query = [...v1]; // should match v1 exactly

    await engine.insert("sin", v1);
    await engine.insert("cos", v2);

    const results = await engine.search(query, 1);
    expect(results[0].id).toBe("sin");
    expect(results[0].distance).toBeCloseTo(0, 5);
  });
});

describe("VectorSearchEngine interface contract", () => {
  it("BruteForceSearch has the expected name", () => {
    const engine = new BruteForceSearch();
    expect(engine.name).toBe("brute-force");
  });
});

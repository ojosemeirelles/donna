import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMemoryStats } from "./stats.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(import.meta.dirname ?? ".", "stats-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("getMemoryStats", () => {
  it("returns zeros for an empty (nonexistent) memory dir", async () => {
    const stats = await getMemoryStats("/tmp/nonexistent-memory-dir-xyz");
    expect(stats).toEqual({
      totalVectors: 0,
      totalChunks: 0,
      diskSizeBytes: 0,
      embeddingModel: "unknown",
      embeddingDimensions: 0,
      searchEngine: "brute-force",
      oldestEntry: null,
      newestEntry: null,
    });
  });

  it("returns zeros for an empty memory dir", async () => {
    const stats = await getMemoryStats(tmpDir);
    expect(stats.diskSizeBytes).toBe(0);
    expect(stats.totalChunks).toBe(0);
    expect(stats.totalVectors).toBe(0);
  });

  it("calculates disk size from files in the directory", async () => {
    const content = "hello world test data";
    await fs.writeFile(path.join(tmpDir, "a.txt"), content);
    await fs.writeFile(path.join(tmpDir, "b.txt"), content);

    const stats = await getMemoryStats(tmpDir);
    // Each file is the same content length in bytes
    expect(stats.diskSizeBytes).toBe(Buffer.byteLength(content) * 2);
  });

  it("calculates disk size recursively", async () => {
    const subDir = path.join(tmpDir, "sub");
    await fs.mkdir(subDir);
    await fs.writeFile(path.join(subDir, "nested.txt"), "1234567890");

    const stats = await getMemoryStats(tmpDir);
    expect(stats.diskSizeBytes).toBe(10);
  });

  it("reads chunks and model from status", async () => {
    const stats = await getMemoryStats(tmpDir, {
      chunks: 42,
      model: "text-embedding-3-small",
      vector: { enabled: true, available: true, dims: 1536 },
    });
    expect(stats.totalChunks).toBe(42);
    expect(stats.embeddingModel).toBe("text-embedding-3-small");
    expect(stats.embeddingDimensions).toBe(1536);
    expect(stats.searchEngine).toBe("sqlite-vec");
  });

  it("reports brute-force when vector is disabled", async () => {
    const stats = await getMemoryStats(tmpDir, {
      vector: { enabled: false },
    });
    expect(stats.searchEngine).toBe("brute-force");
  });

  it("reports brute-force when vector is enabled but not available", async () => {
    const stats = await getMemoryStats(tmpDir, {
      vector: { enabled: true, available: false },
    });
    expect(stats.searchEngine).toBe("brute-force");
  });

  it("reads vector count and timestamps from db accessor", async () => {
    const oldest = Date.now() - 86400_000;
    const newest = Date.now();
    const stats = await getMemoryStats(
      tmpDir,
      { model: "test-model" },
      {
        getOldestUpdatedAt: () => oldest,
        getNewestUpdatedAt: () => newest,
        getVectorCount: (model: string) => (model === "test-model" ? 100 : 0),
      },
    );
    expect(stats.totalVectors).toBe(100);
    expect(stats.oldestEntry).toEqual(new Date(oldest));
    expect(stats.newestEntry).toEqual(new Date(newest));
  });

  it("handles null timestamps from db", async () => {
    const stats = await getMemoryStats(tmpDir, undefined, {
      getOldestUpdatedAt: () => null,
      getNewestUpdatedAt: () => null,
      getVectorCount: () => 0,
    });
    expect(stats.oldestEntry).toBeNull();
    expect(stats.newestEntry).toBeNull();
  });
});

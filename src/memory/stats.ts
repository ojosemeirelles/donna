import fs from "node:fs/promises";
import path from "node:path";

export interface MemoryStats {
  totalVectors: number;
  totalChunks: number;
  diskSizeBytes: number;
  embeddingModel: string;
  embeddingDimensions: number;
  searchEngine: string;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * Collect memory stats from a MemoryProviderStatus object and memory directory.
 *
 * This avoids coupling to the MemoryIndexManager internals — it reads
 * the already-exposed status() output plus the filesystem.
 */
export async function getMemoryStats(
  memoryDir: string,
  status?: {
    chunks?: number;
    model?: string;
    provider?: string;
    vector?: { enabled: boolean; available?: boolean; dims?: number };
  },
  db?: {
    getOldestUpdatedAt(): number | null;
    getNewestUpdatedAt(): number | null;
    getVectorCount(model: string): number;
  },
): Promise<MemoryStats> {
  const diskSizeBytes = await calculateDirSize(memoryDir);

  const chunks = status?.chunks ?? 0;
  const model = status?.model ?? "unknown";
  const dims = status?.vector?.dims ?? 0;

  const vectorAvailable = status?.vector?.enabled && status?.vector?.available;
  const searchEngine = vectorAvailable ? "sqlite-vec" : "brute-force";

  let totalVectors = 0;
  let oldestEntry: Date | null = null;
  let newestEntry: Date | null = null;

  if (db) {
    totalVectors = db.getVectorCount(model);
    const oldestTs = db.getOldestUpdatedAt();
    const newestTs = db.getNewestUpdatedAt();
    oldestEntry = oldestTs !== null ? new Date(oldestTs) : null;
    newestEntry = newestTs !== null ? new Date(newestTs) : null;
  }

  return {
    totalVectors,
    totalChunks: chunks,
    diskSizeBytes,
    embeddingModel: model,
    embeddingDimensions: dims,
    searchEngine,
    oldestEntry,
    newestEntry,
  };
}

/**
 * Recursively calculate total size of files in a directory.
 * Returns 0 if the directory does not exist.
 */
async function calculateDirSize(dirPath: string): Promise<number> {
  let total = 0;
  let names: string[];
  try {
    names = await fs.readdir(dirPath);
  } catch {
    return 0;
  }
  for (const name of names) {
    const fullPath = path.join(dirPath, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        total += await calculateDirSize(fullPath);
      } else if (stat.isFile()) {
        total += stat.size;
      }
    } catch {
      // Entry may have been removed between readdir and stat; skip.
    }
  }
  return total;
}

import fs from "node:fs";
import path from "node:path";

export interface CleanupConfig {
  /** Maximum age in days before a transcript file is eligible for removal. Default: 30. */
  maxAgeDays: number;
  /** Maximum number of transcript files to keep. Oldest removed first. Default: 1000. */
  maxCount: number;
  /** When true, report what would be deleted without actually deleting. Default: false. */
  dryRun: boolean;
}

export interface CleanupResult {
  /** Number of transcript files deleted (or that would be deleted in dry-run). */
  deletedCount: number;
  /** Total bytes freed (or that would be freed in dry-run). */
  freedBytes: number;
  /** Number of transcript files kept. */
  keptCount: number;
  /** Paths of deleted (or would-be-deleted) files. */
  deletedPaths: string[];
}

const DEFAULT_CONFIG: CleanupConfig = {
  maxAgeDays: 30,
  maxCount: 1000,
  dryRun: false,
};

interface TranscriptFileStat {
  filePath: string;
  fileName: string;
  size: number;
  mtimeMs: number;
}

/**
 * Determine whether a file in the sessions directory is a transcript file
 * eligible for cleanup. Skips `sessions.json`, backup files, and non-.jsonl files.
 */
function isCleanableTranscriptFile(fileName: string): boolean {
  if (fileName === "sessions.json") {
    return false;
  }
  // Skip session store backup files (sessions.json.bak.*)
  if (fileName.startsWith("sessions.json.bak.")) {
    return false;
  }
  return fileName.endsWith(".jsonl");
}

async function readTranscriptFiles(sessionsDir: string): Promise<TranscriptFileStat[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(sessionsDir, { withFileTypes: true });
  } catch {
    // Directory does not exist or is not readable -- nothing to clean.
    return [];
  }

  const files: TranscriptFileStat[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!isCleanableTranscriptFile(entry.name)) {
      continue;
    }
    const filePath = path.join(sessionsDir, entry.name);
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }
      files.push({
        filePath,
        fileName: entry.name,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    } catch {
      // File may have been removed between readdir and stat; skip.
    }
  }
  return files;
}

/**
 * Clean up session transcript files in a sessions directory.
 *
 * Two strategies are applied in order:
 * 1. **TTL cleanup:** Remove transcript files whose mtime is older than `maxAgeDays`.
 * 2. **Count cap:** If more than `maxCount` files remain after TTL cleanup,
 *    remove the oldest files until the count is within limit.
 *
 * The function never removes `sessions.json` or its backups.
 * When `dryRun` is true, no files are actually deleted.
 */
export async function cleanupSessions(
  sessionsDir: string,
  config?: Partial<CleanupConfig>,
): Promise<CleanupResult> {
  const resolved: CleanupConfig = { ...DEFAULT_CONFIG, ...config };
  const nowMs = Date.now();
  const maxAgeMs = resolved.maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoffMs = nowMs - maxAgeMs;

  const allFiles = await readTranscriptFiles(sessionsDir);

  if (allFiles.length === 0) {
    return { deletedCount: 0, freedBytes: 0, keptCount: 0, deletedPaths: [] };
  }

  const deletedPaths: string[] = [];
  let freedBytes = 0;

  // Phase 1: TTL cleanup -- remove files older than cutoff.
  const surviving: TranscriptFileStat[] = [];
  for (const file of allFiles) {
    if (file.mtimeMs < cutoffMs) {
      deletedPaths.push(file.filePath);
      freedBytes += file.size;
      if (!resolved.dryRun) {
        await fs.promises.unlink(file.filePath).catch(() => undefined);
      }
    } else {
      surviving.push(file);
    }
  }

  // Phase 2: Count cap -- remove oldest files if over maxCount.
  if (surviving.length > resolved.maxCount) {
    // Sort ascending by mtime so oldest files are first.
    surviving.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const excess = surviving.length - resolved.maxCount;
    const toRemove = surviving.splice(0, excess);
    for (const file of toRemove) {
      deletedPaths.push(file.filePath);
      freedBytes += file.size;
      if (!resolved.dryRun) {
        await fs.promises.unlink(file.filePath).catch(() => undefined);
      }
    }
  }

  return {
    deletedCount: deletedPaths.length,
    freedBytes,
    keptCount: surviving.length,
    deletedPaths,
  };
}

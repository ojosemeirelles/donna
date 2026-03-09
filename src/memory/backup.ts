/**
 * Memory Backup — export/import for the 3-layer Donna memory system.
 *
 * Exports identity, patterns, and episodic memories to a single JSON file.
 * Imports restore those layers from a backup, creating the memory directory
 * if needed.
 *
 * The backup format is self-describing with version and metadata so future
 * migrations can read older exports.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  loadEpisode,
  loadEpisodeSummary,
  saveEpisodeSummary,
  type Episode,
  type EpisodeSummary,
} from "./episodic-memory.js";
import { loadIdentity, saveIdentity, type UserIdentity } from "./identity-memory.js";
import { loadPatternStore, savePatternStore, type PatternStore } from "./pattern-memory.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryBackupMeta = {
  version: number;
  exportedAt: string;
  agentId?: string;
  memoryDir: string;
};

export type MemoryBackup = {
  meta: MemoryBackupMeta;
  identity: UserIdentity;
  patterns: PatternStore;
  episodes: Episode[];
  summaries: EpisodeSummary[];
};

const BACKUP_VERSION = 1;
const EPISODES_DIR = "episodes";
const SUMMARIES_DIR = "summaries";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Collects all episode files from the episodes directory.
 * Returns date strings (YYYY-MM-DD) found.
 */
async function listEpisodeDates(memoryDir: string): Promise<string[]> {
  const episodesPath = path.join(memoryDir, EPISODES_DIR);
  try {
    const entries = await fs.readdir(episodesPath);
    return entries
      .filter((e) => /^\d{4}-\d{2}-\d{2}\.json$/.test(e))
      .map((e) => e.replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * Collects all summary files from the summaries directory.
 * Returns date strings (YYYY-MM-DD) found.
 */
async function listSummaryDates(memoryDir: string): Promise<string[]> {
  const summariesPath = path.join(memoryDir, EPISODES_DIR, SUMMARIES_DIR);
  try {
    const entries = await fs.readdir(summariesPath);
    return entries
      .filter((e) => /^\d{4}-\d{2}-\d{2}\.json$/.test(e))
      .map((e) => e.replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * Exports all memory data (identity, patterns, episodes, summaries)
 * to a JSON file at `outputPath`.
 */
export async function exportMemory(
  memoryDir: string,
  outputPath: string,
  agentId?: string,
): Promise<MemoryBackup> {
  const identity = await loadIdentity(memoryDir);
  const patterns = await loadPatternStore(memoryDir);

  const episodeDates = await listEpisodeDates(memoryDir);
  const episodes: Episode[] = [];
  for (const date of episodeDates) {
    const episode = await loadEpisode(memoryDir, date);
    if (episode.entries.length > 0) {
      episodes.push(episode);
    }
  }

  const summaryDates = await listSummaryDates(memoryDir);
  const summaries: EpisodeSummary[] = [];
  for (const date of summaryDates) {
    const summary = await loadEpisodeSummary(memoryDir, date);
    if (summary) {
      summaries.push(summary);
    }
  }

  const backup: MemoryBackup = {
    meta: {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      agentId,
      memoryDir,
    },
    identity,
    patterns,
    episodes,
    summaries,
  };

  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(backup, null, 2), "utf-8");

  return backup;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Validates backup structure and returns parsed data.
 * Throws on invalid/corrupt input.
 */
export function parseBackup(raw: string): MemoryBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Backup file has invalid structure (expected object).");
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Backup file missing 'meta' section.");
  }

  const meta = obj.meta as Record<string, unknown>;
  if (typeof meta.version !== "number") {
    throw new Error("Backup meta missing 'version' field.");
  }

  if (meta.version > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${meta.version} is newer than supported (${BACKUP_VERSION}). Update Donna first.`,
    );
  }

  return {
    meta: {
      version: meta.version,
      exportedAt: typeof meta.exportedAt === "string" ? meta.exportedAt : "",
      agentId: typeof meta.agentId === "string" ? meta.agentId : undefined,
      memoryDir: typeof meta.memoryDir === "string" ? meta.memoryDir : "",
    },
    identity:
      obj.identity && typeof obj.identity === "object" && !Array.isArray(obj.identity)
        ? (obj.identity as UserIdentity)
        : {},
    patterns:
      obj.patterns && typeof obj.patterns === "object" && !Array.isArray(obj.patterns)
        ? (obj.patterns as PatternStore)
        : { events: [] },
    episodes: Array.isArray(obj.episodes) ? (obj.episodes as Episode[]) : [],
    summaries: Array.isArray(obj.summaries) ? (obj.summaries as EpisodeSummary[]) : [],
  };
}

/**
 * Writes episode data to the episodes directory.
 */
async function writeEpisode(memoryDir: string, episode: Episode): Promise<void> {
  const episodesPath = path.join(memoryDir, EPISODES_DIR);
  await fs.mkdir(episodesPath, { recursive: true });
  const filePath = path.join(episodesPath, `${episode.date}.json`);
  await fs.writeFile(filePath, JSON.stringify(episode, null, 2), "utf-8");
}

/**
 * Imports memory from a JSON backup file into the target memory directory.
 * Creates directories as needed. Overwrites existing data.
 */
export async function importMemory(inputPath: string, memoryDir: string): Promise<MemoryBackup> {
  const raw = await fs.readFile(inputPath, "utf-8");
  const backup = parseBackup(raw);

  await fs.mkdir(memoryDir, { recursive: true });

  // Identity
  if (Object.keys(backup.identity).length > 0) {
    await saveIdentity(memoryDir, backup.identity);
  }

  // Patterns
  if (backup.patterns.events.length > 0 || backup.patterns.summary) {
    await savePatternStore(memoryDir, backup.patterns);
  }

  // Episodes
  for (const episode of backup.episodes) {
    await writeEpisode(memoryDir, episode);
  }

  // Summaries
  for (const summary of backup.summaries) {
    await saveEpisodeSummary(memoryDir, summary.date, summary);
  }

  return backup;
}

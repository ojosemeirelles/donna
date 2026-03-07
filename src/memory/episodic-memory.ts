/**
 * Episodic Memory — daily episode logs with search and periodic summaries.
 *
 * Writes structured entries to ~/.donna/memory/episodes/YYYY-MM-DD.json.
 * Summaries are stored separately under episodes/summaries/YYYY-MM-DD.json
 * and retained much longer than raw entries (default: 365 days vs. 30 days).
 */

import fs from "node:fs/promises";
import path from "node:path";

export type EpisodicMemoryConfig = {
  /** Enable episodic memory layer. Default: true. */
  enabled?: boolean;
  /** Days to retain raw episode entries. Default: 30. */
  retentionDays?: number;
  /** Days to retain episode summaries. Default: 365. */
  summaryRetentionDays?: number;
};

export type EpisodeEntryType = "session_start" | "session_end" | "message" | "tool" | "summary";

export type EpisodeEntry = {
  timestamp: string;
  type: EpisodeEntryType;
  content: string;
  metadata?: Record<string, string>;
};

export type Episode = {
  date: string; // YYYY-MM-DD
  entries: EpisodeEntry[];
};

export type EpisodeSummary = {
  date: string;
  summary: string;
  keyTopics: string[];
  createdAt: string;
};

const EPISODES_DIR = "episodes";
const SUMMARIES_DIR = "summaries";
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_SUMMARY_RETENTION_DAYS = 365;

/** Resolves config with defaults applied. */
export function resolveEpisodicConfig(raw?: EpisodicMemoryConfig): Required<EpisodicMemoryConfig> {
  return {
    enabled: raw?.enabled ?? true,
    retentionDays: raw?.retentionDays ?? DEFAULT_RETENTION_DAYS,
    summaryRetentionDays: raw?.summaryRetentionDays ?? DEFAULT_SUMMARY_RETENTION_DAYS,
  };
}

/** Returns "YYYY-MM-DD" for the given date (defaults to today in local time). */
export function episodeDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Extracts key topics from episode entries by picking frequently mentioned
 * capitalized words and filtering common stop words.
 */
export function extractKeyTopics(entries: EpisodeEntry[]): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "it",
    "in",
    "on",
    "at",
    "to",
    "of",
    "for",
    "and",
    "or",
    "but",
    "not",
    "this",
    "that",
    "with",
    "from",
    "my",
    "me",
    "i",
    "you",
    "we",
    "they",
  ]);
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const words = entry.content.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (clean.length >= 4 && !stopWords.has(clean)) {
        counts.set(clean, (counts.get(clean) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

/**
 * Builds a prompt for the agent to generate an episode summary.
 * The resulting text is sent as an agent turn in the consolidation cron job.
 */
export function buildEpisodeSummaryPrompt(episode: Episode, language = "pt"): string {
  const isPt = language === "pt";
  const entryLines = episode.entries
    .slice(0, 50) // cap to avoid huge prompts
    .map((e) => `[${e.timestamp.slice(11, 16)}] ${e.type}: ${e.content.slice(0, 120)}`)
    .join("\n");

  if (isPt) {
    return [
      `Crie um resumo conciso do episódio de ${episode.date}.`,
      ``,
      `Entradas do episódio:`,
      entryLines,
      ``,
      `Responda com:`,
      `- Resumo: (2-3 frases descrevendo o que aconteceu nesta sessão)`,
      `- Tópicos-chave: (lista de até 5 tópicos principais separados por vírgula)`,
    ].join("\n");
  }

  return [
    `Create a concise summary of the episode for ${episode.date}.`,
    ``,
    `Episode entries:`,
    entryLines,
    ``,
    `Reply with:`,
    `- Summary: (2-3 sentences describing what happened in this session)`,
    `- Key topics: (up to 5 main topics separated by comma)`,
  ].join("\n");
}

/**
 * Builds the Markdown context block for recent episodes injected into
 * the agent's system prompt. Uses today's summary if available, falling
 * back to yesterday's.
 */
export function buildEpisodicContextBlock(
  todaySummary: EpisodeSummary | null,
  yesterdaySummary: EpisodeSummary | null,
): string {
  const summary = todaySummary ?? yesterdaySummary;
  if (!summary) {
    return "";
  }

  const lines: string[] = ["## Recent Context"];
  lines.push(`- Last session (${summary.date}): ${summary.summary}`);
  if (summary.keyTopics.length > 0) {
    lines.push(`- Topics: ${summary.keyTopics.join(", ")}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

function episodeFilePath(memoryDir: string, date: string): string {
  return path.join(memoryDir, EPISODES_DIR, `${date}.json`);
}

function summaryFilePath(memoryDir: string, date: string): string {
  return path.join(memoryDir, EPISODES_DIR, SUMMARIES_DIR, `${date}.json`);
}

/** Loads episode for the given date. Returns empty episode on miss/error. */
export async function loadEpisode(memoryDir: string, date: string): Promise<Episode> {
  try {
    const raw = await fs.readFile(episodeFilePath(memoryDir, date), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { date, entries: [] };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      date: typeof obj.date === "string" ? obj.date : date,
      entries: Array.isArray(obj.entries) ? (obj.entries as EpisodeEntry[]) : [],
    };
  } catch {
    return { date, entries: [] };
  }
}

/** Appends an entry to the episode for the given date, creating the file if needed. */
export async function appendEpisodeEntry(
  memoryDir: string,
  date: string,
  entry: EpisodeEntry,
): Promise<void> {
  const episodesPath = path.join(memoryDir, EPISODES_DIR);
  await fs.mkdir(episodesPath, { recursive: true });

  const episode = await loadEpisode(memoryDir, date);
  episode.entries.push(entry);

  await fs.writeFile(episodeFilePath(memoryDir, date), JSON.stringify(episode, null, 2), "utf-8");
}

/** Loads episode summary for the given date. Returns null on miss/error. */
export async function loadEpisodeSummary(
  memoryDir: string,
  date: string,
): Promise<EpisodeSummary | null> {
  try {
    const raw = await fs.readFile(summaryFilePath(memoryDir, date), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as EpisodeSummary;
  } catch {
    return null;
  }
}

/** Saves an episode summary to <memoryDir>/episodes/summaries/<date>.json. */
export async function saveEpisodeSummary(
  memoryDir: string,
  date: string,
  summary: EpisodeSummary,
): Promise<void> {
  const summariesPath = path.join(memoryDir, EPISODES_DIR, SUMMARIES_DIR);
  await fs.mkdir(summariesPath, { recursive: true });
  await fs.writeFile(summaryFilePath(memoryDir, date), JSON.stringify(summary, null, 2), "utf-8");
}

/**
 * Searches recent episode entries for the given query string.
 * Returns episodes (up to maxDays back) that contain a matching entry.
 */
export async function searchEpisodes(
  memoryDir: string,
  query: string,
  maxDays = 14,
): Promise<Episode[]> {
  const results: Episode[] = [];
  const lq = query.toLowerCase();
  const today = new Date();

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = episodeDateString(d);

    const episode = await loadEpisode(memoryDir, dateStr);
    if (
      episode.entries.length > 0 &&
      episode.entries.some((e) => e.content.toLowerCase().includes(lq))
    ) {
      results.push(episode);
    }
  }

  return results;
}

/**
 * Prunes raw episode files older than retentionDays and summary files older
 * than summaryRetentionDays. Returns the count of deleted files.
 */
export async function pruneEpisodes(
  memoryDir: string,
  retentionDays: number,
  summaryRetentionDays: number,
): Promise<number> {
  let deleted = 0;
  const now = Date.now();

  const pruneDir = async (dir: string, maxDays: number) => {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      // Only process YYYY-MM-DD.json files
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(entry)) {
        continue;
      }
      const dateStr = entry.replace(".json", "");
      const fileDate = new Date(dateStr).getTime();
      if (!Number.isNaN(fileDate) && now - fileDate > maxDays * 24 * 60 * 60 * 1000) {
        try {
          await fs.unlink(path.join(dir, entry));
          deleted++;
        } catch {
          // Skip files we can't delete
        }
      }
    }
  };

  await pruneDir(path.join(memoryDir, EPISODES_DIR), retentionDays);
  await pruneDir(path.join(memoryDir, EPISODES_DIR, SUMMARIES_DIR), summaryRetentionDays);

  return deleted;
}

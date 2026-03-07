/**
 * Pattern Memory — behavioral pattern tracking and analysis.
 *
 * Records lightweight events (tool calls, session starts, messages) in
 * ~/.donna/memory/patterns.json and produces aggregated summaries used to
 * adapt the agent's behavior over time. Events older than retentionDays are
 * pruned on every write.
 */

import fs from "node:fs/promises";
import path from "node:path";

export type PatternMemoryConfig = {
  /** Enable pattern memory layer. Default: true. */
  enabled?: boolean;
  /** Days to retain raw events. Default: 28. */
  retentionDays?: number;
  /** Run analysis on Sundays. Default: true. */
  analyzeOnSunday?: boolean;
};

export type PatternEvent = {
  /** Event type, e.g. "tool_use", "session_start", "message_sent". */
  type: string;
  /** Optional string value associated with the event. */
  value?: string;
  /** ISO timestamp. */
  timestamp: string;
};

export type PatternSummary = {
  /** Top tools used, sorted by count descending. */
  topTools: Array<{ name: string; count: number }>;
  /** 24-element histogram: count of events per hour (index = hour 0-23). */
  activeHours: number[];
  /** Total events analysed. */
  totalEvents: number;
  /** ISO timestamp when the analysis was produced. */
  analyzedAt: string;
};

export type PatternStore = {
  events: PatternEvent[];
  lastAnalyzedAt?: string;
  summary?: PatternSummary;
};

const PATTERN_FILE = "patterns.json";
const DEFAULT_RETENTION_DAYS = 28;
const MAX_EVENTS = 5000; // hard cap to prevent unbounded growth

/** Resolves config with defaults applied. */
export function resolvePatternConfig(raw?: PatternMemoryConfig): Required<PatternMemoryConfig> {
  return {
    enabled: raw?.enabled ?? true,
    retentionDays: raw?.retentionDays ?? DEFAULT_RETENTION_DAYS,
    analyzeOnSunday: raw?.analyzeOnSunday ?? true,
  };
}

/**
 * Returns true when pattern analysis should run now.
 * If analyzeOnSunday=true, only runs when today is Sunday.
 * If lastAnalyzedAt is today, it is skipped to avoid duplicate runs.
 */
export function shouldAnalyzeNow(
  lastAnalyzedAt: string | undefined,
  config: Required<PatternMemoryConfig>,
  now: Date = new Date(),
): boolean {
  if (!config.analyzeOnSunday) {
    return true;
  }
  // Sunday = 0
  if (now.getDay() !== 0) {
    return false;
  }
  if (!lastAnalyzedAt) {
    return true;
  }
  // Don't re-run if already analyzed today
  const lastDate = lastAnalyzedAt.slice(0, 10);
  const todayDate = now.toISOString().slice(0, 10);
  return lastDate !== todayDate;
}

/**
 * Removes events older than retentionDays from the list.
 * Also enforces MAX_EVENTS hard cap (keeps the most recent).
 */
export function pruneOldEvents(events: PatternEvent[], retentionDays: number): PatternEvent[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const fresh = events.filter((e) => {
    const ts = new Date(e.timestamp).getTime();
    return !Number.isNaN(ts) && ts >= cutoff;
  });
  // Keep most recent MAX_EVENTS if over cap
  return fresh.length > MAX_EVENTS ? fresh.slice(fresh.length - MAX_EVENTS) : fresh;
}

/**
 * Aggregates a list of events into a PatternSummary.
 * Tool events (type="tool_use") contribute to topTools.
 * All events contribute to the activeHours histogram.
 */
export function aggregatePatterns(events: PatternEvent[]): PatternSummary {
  const toolCounts = new Map<string, number>();
  const activeHours = Array.from<number>({ length: 24 }).fill(0);

  for (const event of events) {
    // Active hours histogram
    const hour = new Date(event.timestamp).getHours();
    if (hour >= 0 && hour < 24) {
      activeHours[hour] = (activeHours[hour] ?? 0) + 1;
    }

    // Tool usage counts
    if (event.type === "tool_use" && event.value) {
      toolCounts.set(event.value, (toolCounts.get(event.value) ?? 0) + 1);
    }
  }

  const topTools = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    topTools,
    activeHours,
    totalEvents: events.length,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Builds the Markdown context block for pattern data injected into the agent
 * system prompt. Returns empty string when no meaningful data is available.
 */
export function buildPatternContextBlock(summary: PatternSummary): string {
  if (summary.totalEvents === 0) {
    return "";
  }

  const lines: string[] = ["## Usage Patterns"];

  if (summary.topTools.length > 0) {
    const tools = summary.topTools
      .slice(0, 5)
      .map((t) => `${t.name} (${t.count}x)`)
      .join(", ");
    lines.push(`- Most used tools: ${tools}`);
  }

  // Find the 3 most active hours
  const peakHours = summary.activeHours
    .map((count, hour) => ({ hour, count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((h) => h.count > 0)
    .map((h) => `${h.hour}h`)
    .join(", ");
  if (peakHours) {
    lines.push(`- Most active hours: ${peakHours}`);
  }

  return lines.join("\n");
}

/** Loads pattern store from <memoryDir>/patterns.json. Returns empty store on miss. */
export async function loadPatternStore(memoryDir: string): Promise<PatternStore> {
  const filePath = path.join(memoryDir, PATTERN_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { events: [] };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      events: Array.isArray(obj.events) ? (obj.events as PatternEvent[]) : [],
      lastAnalyzedAt: typeof obj.lastAnalyzedAt === "string" ? obj.lastAnalyzedAt : undefined,
      summary: obj.summary ? (obj.summary as PatternSummary) : undefined,
    };
  } catch {
    return { events: [] };
  }
}

/** Saves pattern store to <memoryDir>/patterns.json, creating the dir if needed. */
export async function savePatternStore(memoryDir: string, store: PatternStore): Promise<void> {
  await fs.mkdir(memoryDir, { recursive: true });
  const filePath = path.join(memoryDir, PATTERN_FILE);
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Appends a pattern event, prunes old events, and persists.
 * Gracefully handles I/O errors by failing silently.
 */
export async function recordEvent(
  memoryDir: string,
  event: PatternEvent,
  config?: PatternMemoryConfig,
): Promise<void> {
  const cfg = resolvePatternConfig(config);
  try {
    const store = await loadPatternStore(memoryDir);
    store.events.push(event);
    store.events = pruneOldEvents(store.events, cfg.retentionDays);

    // Run analysis when scheduled
    if (shouldAnalyzeNow(store.lastAnalyzedAt, cfg)) {
      store.summary = aggregatePatterns(store.events);
      store.lastAnalyzedAt = new Date().toISOString();
    }

    await savePatternStore(memoryDir, store);
  } catch {
    // Never let a memory write break the agent pipeline.
  }
}

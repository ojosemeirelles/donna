/**
 * Shadow Execution Tracker — append-only JSONL history of shadow dispatches.
 * Stored at ~/.donna/shadows/history.jsonl with configurable retention (default 7 days).
 */

import { appendFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { ShadowExecution, ShadowIntent } from "./types.js";

const DEFAULT_RETENTION_DAYS = 7;

function resolveRetentionDays(): number {
  const env = process.env.DONNA_SHADOW_HISTORY_RETENTION_DAYS;
  return env ? Number.parseInt(env, 10) || DEFAULT_RETENTION_DAYS : DEFAULT_RETENTION_DAYS;
}

function resolveHistoryPath(): string {
  return (
    process.env.DONNA_SHADOW_HISTORY_PATH ??
    join(homedir(), ".donna", "shadows", "history.jsonl")
  );
}

/**
 * Record a shadow execution to the append-only JSONL history file.
 */
export async function record(execution: ShadowExecution): Promise<void> {
  const historyPath = resolveHistoryPath();
  await mkdir(dirname(historyPath), { recursive: true });
  const line = JSON.stringify(execution) + "\n";
  await appendFile(historyPath, line, "utf-8");
}

/**
 * Read all execution records from the history file.
 * Returns an empty array if the file doesn't exist yet.
 */
export async function readAllRecords(): Promise<ShadowExecution[]> {
  const historyPath = resolveHistoryPath();
  let content: string;
  try {
    content = await readFile(historyPath, "utf-8");
  } catch {
    return [];
  }

  const records: ShadowExecution[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {continue;}
    try {
      records.push(JSON.parse(trimmed) as ShadowExecution);
    } catch {
      // skip malformed lines
    }
  }
  return records;
}

/**
 * Get execution history filtered by shadow name.
 * Optionally limit to the most recent N records.
 */
export async function getHistory(
  shadowName: string,
  limit?: number,
): Promise<ShadowExecution[]> {
  const all = await readAllRecords();
  const filtered = all.filter(
    (r) => r.shadowName.toLowerCase() === shadowName.toLowerCase(),
  );
  if (limit && limit > 0) {
    return filtered.slice(-limit);
  }
  return filtered;
}

export type ShadowExecutionSummary = {
  totalExecutions: number;
  byShadow: Record<string, { count: number; totalDurationMs: number; failures: number }>;
  byIntent: Record<string, number>;
  byStatus: Record<string, number>;
  totalTokens: { input: number; output: number };
};

/**
 * Get an aggregate summary of all shadow executions.
 */
export async function getSummary(): Promise<ShadowExecutionSummary> {
  const all = await readAllRecords();

  const summary: ShadowExecutionSummary = {
    totalExecutions: all.length,
    byShadow: {},
    byIntent: {},
    byStatus: {},
    totalTokens: { input: 0, output: 0 },
  };

  for (const exec of all) {
    // By shadow
    if (!summary.byShadow[exec.shadowName]) {
      summary.byShadow[exec.shadowName] = { count: 0, totalDurationMs: 0, failures: 0 };
    }
    const s = summary.byShadow[exec.shadowName];
    s.count += 1;
    s.totalDurationMs += exec.durationMs;
    if (exec.status === "failed") {s.failures += 1;}

    // By intent
    summary.byIntent[exec.intent] = (summary.byIntent[exec.intent] ?? 0) + 1;

    // By status
    summary.byStatus[exec.status] = (summary.byStatus[exec.status] ?? 0) + 1;

    // Tokens
    summary.totalTokens.input += exec.tokenUsage.input;
    summary.totalTokens.output += exec.tokenUsage.output;
  }

  return summary;
}

/**
 * Prune execution records older than the retention period.
 * Rewrites the history file with only the retained records.
 * Returns the number of pruned records.
 */
export async function pruneOldRecords(): Promise<number> {
  const retentionDays = resolveRetentionDays();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const all = await readAllRecords();
  const retained = all.filter((r) => r.startedAt >= cutoff);
  const pruned = all.length - retained.length;

  if (pruned > 0) {
    const historyPath = resolveHistoryPath();
    const content = retained.map((r) => JSON.stringify(r)).join("\n") + (retained.length ? "\n" : "");
    await writeFile(historyPath, content, "utf-8");
  }

  return pruned;
}

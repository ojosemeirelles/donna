/**
 * Cost Report Hook — daily cost breakdown delivered at 20h.
 *
 * Follows the morning-brief pattern: registers a cron job on gateway startup
 * that generates a cost report and delivers it via the configured channel.
 */

import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { resolveCronStorePath, loadCronStore, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { loadCostUsageSummary } from "../../../infra/session-cost-usage.js";
import type { InternalHookEvent } from "../../internal-hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

export const COST_REPORT_JOB_ID = "cost-report-daily";

export type CostReportConfig = {
  /** Cron expression for report delivery. Default: "0 20 * * *" (20h). */
  time?: string;
  /** IANA timezone string. Default: system timezone. */
  timezone?: string;
  /** Report language: "pt" or "en". Default: "pt". */
  language?: string;
  /** Telegram chat ID for delivery. If absent, job runs but does not deliver. */
  telegramChatId?: string;
};

const DEFAULT_CRON_TIME = "0 20 * * *";
const DEFAULT_LANGUAGE = "pt";

/** Loads cost-report config from the hook config file in stateDir. */
export async function loadCostReportConfig(stateDir: string): Promise<CostReportConfig> {
  const configPath = path.join(stateDir, "hooks", "cost-report.json");
  try {
    const raw = await fs.promises.readFile(configPath, "utf-8");
    const parsed = JSON5.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const record = parsed as Record<string, unknown>;
    return {
      time: typeof record.time === "string" ? record.time : undefined,
      timezone: typeof record.timezone === "string" ? record.timezone : undefined,
      language: typeof record.language === "string" ? record.language : undefined,
      telegramChatId: typeof record.telegramChatId === "string" ? record.telegramChatId : undefined,
    };
  } catch {
    // File absent or malformed → use defaults.
    return {};
  }
}

/** Builds the natural language prompt sent to the agent for generating the report. */
export async function buildCostReportPrompt(
  config: CostReportConfig,
  _stateDir: string,
): Promise<string> {
  const lang = config.language ?? DEFAULT_LANGUAGE;
  const isPt = lang === "pt";

  // Fetch real cost data for the last 2 days (today + yesterday for diff).
  const summary = await loadCostUsageSummary({ days: 2 }).catch(() => null);

  const todayEntry = summary?.daily?.at(-1);
  const yesterdayEntry = summary?.daily?.at(-2);

  const todayCost = todayEntry?.totalCost ?? 0;
  const yesterdayCost = yesterdayEntry?.totalCost ?? 0;
  const diff = todayCost - yesterdayCost;
  const diffPct = yesterdayCost > 0 ? ((diff / yesterdayCost) * 100).toFixed(1) : "N/A";

  const todayTokens = todayEntry
    ? (todayEntry.input ?? 0) + (todayEntry.output ?? 0) + (todayEntry.cacheRead ?? 0)
    : 0;

  if (isPt) {
    return [
      `Gere o relatório de custo de IA de hoje no formato definido na skill cost-report.`,
      ``,
      `Dados disponíveis:`,
      `- Custo total hoje: $${todayCost.toFixed(4)}`,
      `- Tokens totais hoje: ${todayTokens}`,
      `- Custo ontem: $${yesterdayCost.toFixed(4)}`,
      `- Variação: ${diff >= 0 ? "+" : ""}${diff.toFixed(4)} (${diffPct}%)`,
      ``,
      `Use a skill cost-report para formatar e entregar o relatório. Idioma: português.`,
    ].join("\n");
  }

  return [
    `Generate today's AI cost report using the cost-report skill format.`,
    ``,
    `Available data:`,
    `- Total cost today: $${todayCost.toFixed(4)}`,
    `- Total tokens today: ${todayTokens}`,
    `- Cost yesterday: $${yesterdayCost.toFixed(4)}`,
    `- Change: ${diff >= 0 ? "+" : ""}${diff.toFixed(4)} (${diffPct}%)`,
    ``,
    `Use the cost-report skill to format and deliver the report. Language: English.`,
  ].join("\n");
}

/** Builds the CronJob object for the cost report. */
export function buildCostReportJob(config: CostReportConfig): CronJob {
  const cronExpr = config.time ?? DEFAULT_CRON_TIME;
  const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = Date.now();

  const delivery: CronJob["delivery"] = config.telegramChatId
    ? {
        mode: "announce",
        channel: "telegram",
        to: config.telegramChatId,
      }
    : { mode: "none" };

  return {
    id: COST_REPORT_JOB_ID,
    name: "Daily Cost Report",
    description: "Generates and delivers a daily AI usage cost breakdown at 20h",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: cronExpr, tz },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: {
      kind: "agentTurn",
      message: "__COST_REPORT_PLACEHOLDER__",
      lightContext: true,
      deliver: !!config.telegramChatId,
      ...(config.telegramChatId ? { channel: "telegram", to: config.telegramChatId } : {}),
    },
    delivery,
    state: {},
  };
}

/**
 * Gateway startup hook handler.
 *
 * Registers the cost-report cron job when the gateway starts, if it is not
 * already present. Idempotent: calling this handler multiple times will not
 * create duplicate jobs.
 */
const handler = async (event: InternalHookEvent): Promise<void> => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  const stateDir = (event.context.deps as Record<string, unknown> | undefined)?.stateDir as
    | string
    | undefined;

  try {
    const config = await loadCostReportConfig(stateDir ?? "");
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    // Idempotency: skip if job already registered.
    if (store.jobs.some((j) => j.id === COST_REPORT_JOB_ID)) {
      return;
    }

    // Build the job but replace the placeholder message with the real prompt.
    const job = buildCostReportJob(config);
    const prompt = await buildCostReportPrompt(config, stateDir ?? "");
    if (job.payload.kind === "agentTurn") {
      job.payload.message = prompt;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);
  } catch {
    // Fail gracefully — a missing cost-report job should never crash the gateway.
  }
};

export default handler;

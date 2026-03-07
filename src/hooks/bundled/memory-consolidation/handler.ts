/**
 * Memory Consolidation Hook — weekly memory report via Telegram.
 *
 * Registers a cron job on gateway startup that:
 *   1. Runs every Sunday at 21:00 (configurable).
 *   2. Asks the agent to consolidate memory layers, prune old data, and
 *      generate a weekly insights report.
 *   3. Delivers the report via Telegram (if telegramChatId is configured).
 *
 * Follows the same pattern as morning-brief and cost-report hooks.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSON5 from "json5";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import type { InternalHookEvent } from "../../internal-hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

export const MEMORY_CONSOLIDATION_JOB_ID = "memory-consolidation-weekly";

export type MemoryConsolidationConfig = {
  /** Cron expression. Default: "0 21 * * 0" (Sunday 21:00). */
  time?: string;
  /** IANA timezone. Default: system timezone. */
  timezone?: string;
  /** Report language: "pt" or "en". Default: "pt". */
  language?: string;
  /** Telegram chat ID for report delivery. */
  telegramChatId?: string;
};

const DEFAULT_CRON_TIME = "0 21 * * 0"; // Sunday at 21:00
const DEFAULT_LANGUAGE = "pt";

/** Loads config from <stateDir>/hooks/memory-consolidation.json. */
export async function loadConsolidationConfig(
  stateDir: string,
): Promise<MemoryConsolidationConfig> {
  const configPath = path.join(stateDir, "hooks", "memory-consolidation.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
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
    return {};
  }
}

/** Builds the agent prompt for the weekly memory consolidation report. */
export function buildConsolidationPrompt(config: MemoryConsolidationConfig): string {
  const lang = config.language ?? DEFAULT_LANGUAGE;
  const isPt = lang === "pt";

  if (isPt) {
    return [
      `Execute a consolidação semanal da memória da Donna e gere um relatório de insights.`,
      ``,
      `Passos:`,
      `1. Leia os arquivos de memória em ~/.donna/memory/ (identity.json, patterns.json, episodes/)`,
      `2. Gere resumos para os episódios dos últimos 7 dias que ainda não possuem resumo`,
      `3. Analise os padrões comportamentais da semana`,
      `4. Produza um relatório com:`,
      `   - 🧠 **Resumo da semana**: O que você fez e aprendeu`,
      `   - 🔧 **Ferramentas mais usadas**: Top 5 com frequência`,
      `   - ⏰ **Horários de pico**: Quando você é mais produtivo`,
      `   - 🎯 **Insights**: 2-3 observações sobre seus padrões`,
      `5. Salve o relatório como episódio do dia atual`,
      ``,
      `Responda em português. Use emojis para facilitar a leitura.`,
    ].join("\n");
  }

  return [
    `Execute Donna's weekly memory consolidation and generate an insights report.`,
    ``,
    `Steps:`,
    `1. Read memory files from ~/.donna/memory/ (identity.json, patterns.json, episodes/)`,
    `2. Generate summaries for the last 7 days of episodes that don't have a summary yet`,
    `3. Analyze behavioral patterns for the week`,
    `4. Produce a report with:`,
    `   - 🧠 **Week summary**: What you did and learned`,
    `   - 🔧 **Most used tools**: Top 5 with frequency`,
    `   - ⏰ **Peak hours**: When you're most productive`,
    `   - 🎯 **Insights**: 2-3 observations about your patterns`,
    `5. Save the report as today's episode entry`,
    ``,
    `Reply in English. Use emojis for easy reading.`,
  ].join("\n");
}

/** Builds the CronJob record for the weekly memory consolidation. */
export function buildConsolidationJob(config: MemoryConsolidationConfig): CronJob {
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
    id: MEMORY_CONSOLIDATION_JOB_ID,
    name: "Weekly Memory Consolidation",
    description: "Consolidates memory layers and delivers a weekly insights report on Sundays",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: cronExpr, tz },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: {
      kind: "agentTurn",
      message: buildConsolidationPrompt(config),
      lightContext: true,
      deliver: !!config.telegramChatId,
      ...(config.telegramChatId ? { channel: "telegram" as const, to: config.telegramChatId } : {}),
    },
    delivery,
    state: {},
  };
}

/**
 * Gateway startup hook handler.
 * Registers the memory-consolidation cron job idempotently.
 */
const handler = async (event: InternalHookEvent): Promise<void> => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  const stateDir = resolveStateDir(process.env, os.homedir);

  try {
    const config = await loadConsolidationConfig(stateDir);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    // Idempotency: skip if already registered
    if (store.jobs.some((j) => j.id === MEMORY_CONSOLIDATION_JOB_ID)) {
      return;
    }

    const job = buildConsolidationJob(config);
    store.jobs.push(job);
    await saveCronStore(storePath, store);
  } catch {
    // Fail gracefully — a missing memory cron job should never crash the gateway.
  }
};

export default handler;

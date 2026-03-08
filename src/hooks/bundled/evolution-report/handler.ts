/**
 * Evolution Report — weekly cron hook.
 *
 * Registers a cron job on gateway startup that sends the weekly evolution
 * report every Sunday at 10:00 AM via Telegram.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { EvolutionTracker } from "../../../evolution/tracker.js";
import { buildReportData, formatReportTelegram } from "../../../evolution/report.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/evolution-report");

export const EVOLUTION_REPORT_JOB_ID = "evolution-report-weekly";

export type EvolutionReportConfig = {
  /** Cron expression — default: "0 10 * * 0" (Sunday 10 AM) */
  time?: string;
  /** IANA timezone — default: system timezone */
  timezone?: string;
  /** Telegram chat ID for delivery */
  telegramChatId?: string;
};

/** Load config from ~/.donna/hooks/evolution-report/config.json. */
export async function loadEvolutionReportConfig(
  stateDir: string,
): Promise<EvolutionReportConfig> {
  const configPath = path.join(stateDir, "hooks", "evolution-report", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return JSON.parse(raw) as EvolutionReportConfig;
  } catch {
    return {};
  }
}

/** Build the agent prompt for the evolution report. */
export async function buildEvolutionReportPrompt(): Promise<string> {
  const tracker = new EvolutionTracker();
  await tracker.load();
  const state = tracker.getState();
  const data = buildReportData(state.level, state.stats);
  return formatReportTelegram(data);
}

/** Build the CronJob record for the evolution report. */
export function buildEvolutionReportJob(
  config: EvolutionReportConfig,
  prompt: string,
): CronJob {
  const cronExpr = config.time ?? "0 10 * * 0";
  const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: EVOLUTION_REPORT_JOB_ID,
    agentId: "main",
    name: "Weekly Evolution Report",
    description: "Weekly evolution progress report with insights and initiatives",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: cronExpr, tz },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: prompt,
      lightContext: true,
      deliver: hasDelivery,
      ...(hasDelivery ? { channel: "telegram" as const, to: config.telegramChatId } : {}),
    },
    ...(hasDelivery
      ? {
          delivery: {
            mode: "announce" as const,
            channel: "telegram" as const,
            to: config.telegramChatId,
            bestEffort: true,
          },
        }
      : {}),
    failureAlert: false,
    state: {},
  };
}

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const stateDir = resolveStateDir(process.env, os.homedir);
    const config = await loadEvolutionReportConfig(stateDir);
    const prompt = await buildEvolutionReportPrompt();
    const job = buildEvolutionReportJob(config, prompt);

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === EVOLUTION_REPORT_JOB_ID);
    if (exists) {
      log.debug("evolution-report cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const cronExpr = config.time ?? "0 10 * * 0";
    const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const chatNote = config.telegramChatId
      ? ` → Telegram ${config.telegramChatId}`
      : " (no telegramChatId — set in ~/.donna/hooks/evolution-report/config.json)";

    log.info(`evolution-report registered: ${cronExpr} [${tz}]${chatNote}`);
  } catch (err) {
    log.error("failed to register evolution-report cron job", err);
  }
};

export default handler;

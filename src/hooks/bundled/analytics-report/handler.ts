import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { getAccessToken } from "../../../infra/google-auth.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/analytics-report");

export const ANALYTICS_DAILY_JOB_ID = "analytics-daily";

export type AnalyticsConfig = {
  enabled: boolean;
  propertyId: string;
  telegramChatId: string;
  /** Cron expression for daily report — default: "0 9 * * *" */
  dailyReportTime: string;
  /** Traffic drop alert threshold percent — default: 30 */
  alertDropPercent: number;
};

export type AnalyticsMetrics = {
  sessions: number;
  pageViews: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number;
};

export type PageReport = {
  path: string;
  views: number;
};

const DONNA_DIR = path.join(os.homedir(), ".donna");

function getDefaultAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: true,
    propertyId: "",
    telegramChatId: "6008067521",
    dailyReportTime: "0 9 * * *",
    alertDropPercent: 30,
  };
}

export async function loadAnalyticsConfig(): Promise<AnalyticsConfig> {
  const configPath = path.join(DONNA_DIR, "hooks", "analytics-report", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultAnalyticsConfig(), ...(JSON.parse(raw) as Partial<AnalyticsConfig>) };
  } catch {
    return getDefaultAnalyticsConfig();
  }
}

const GA_API_BASE = "https://analyticsdata.googleapis.com/v1beta/properties";

export async function fetchMetrics(
  token: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<AnalyticsMetrics> {
  const url = `${GA_API_BASE}/${propertyId}:runReport`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };
  const values = data.rows?.[0]?.metricValues ?? [];

  return {
    sessions: Number(values[0]?.value ?? 0),
    pageViews: Number(values[1]?.value ?? 0),
    users: Number(values[2]?.value ?? 0),
    bounceRate: Number(values[3]?.value ?? 0),
    avgSessionDuration: Number(values[4]?.value ?? 0),
  };
}

export async function fetchTopPages(
  token: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<PageReport[]> {
  const url = `${GA_API_BASE}/${propertyId}:runReport`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      limit: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 API error (top pages): ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };

  return (data.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "(unknown)",
    views: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

export function detectTrafficDrop(
  today: AnalyticsMetrics,
  yesterday: AnalyticsMetrics,
  threshold: number,
): { dropped: boolean; percent: number } {
  if (yesterday.sessions === 0) {
    return { dropped: false, percent: 0 };
  }
  const percent = ((yesterday.sessions - today.sessions) / yesterday.sessions) * 100;
  return { dropped: percent >= threshold, percent: Math.round(percent) };
}

export function formatDailyReport(
  metrics: AnalyticsMetrics,
  topPages: PageReport[],
  drop: { dropped: boolean; percent: number } | null,
): string {
  const lines: string[] = [
    "Analytics Daily Report",
    "",
    `Sessions: ${metrics.sessions}`,
    `Page Views: ${metrics.pageViews}`,
    `Users: ${metrics.users}`,
    `Bounce Rate: ${(metrics.bounceRate * 100).toFixed(1)}%`,
    `Avg Session: ${Math.round(metrics.avgSessionDuration)}s`,
  ];

  if (drop?.dropped) {
    lines.push("", `ALERT: Traffic dropped ${drop.percent}% vs yesterday`);
  }

  if (topPages.length > 0) {
    lines.push("", "Top Pages:");
    for (const page of topPages) {
      lines.push(`  ${page.path} — ${page.views} views`);
    }
  }

  return lines.join("\n");
}

/** Returns a traffic summary for the morning brief, or null if unavailable. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadAnalyticsConfig();
    if (!config.enabled || !config.propertyId) {
      return null;
    }

    const token = await getAccessToken();
    const today = new Date().toISOString().slice(0, 10);
    const metrics = await fetchMetrics(token, config.propertyId, today, today);
    return `${metrics.sessions} sessions, ${metrics.users} users, ${metrics.pageViews} page views today`;
  } catch {
    return null;
  }
}

function buildAnalyticsDailyJob(config: AnalyticsConfig): CronJob {
  const cronExpr = config.dailyReportTime ?? "0 9 * * *";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: ANALYTICS_DAILY_JOB_ID,
    agentId: "main",
    name: "Analytics Daily Report",
    description: "Fetch Google Analytics metrics and send daily report",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: cronExpr, tz },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        `Fetch Google Analytics data for property ${config.propertyId}. ` +
        "Compare today's metrics with yesterday. " +
        `Alert if traffic dropped more than ${config.alertDropPercent}%. ` +
        "Include top 10 pages. Format as a concise daily report.",
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
    const config = await loadAnalyticsConfig();
    if (!config.enabled) {
      log.debug("analytics-report hook disabled — skipping registration");
      return;
    }

    if (!config.propertyId) {
      log.warn(
        "analytics-report: no propertyId configured — set it in ~/.donna/hooks/analytics-report/config.json",
      );
      return;
    }

    const job = buildAnalyticsDailyJob(config);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === ANALYTICS_DAILY_JOB_ID);
    if (exists) {
      log.debug("analytics-daily cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured)";

    log.info(
      `analytics-daily registered: ${config.dailyReportTime} [${Intl.DateTimeFormat().resolvedOptions().timeZone}]${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register analytics-daily cron job: ${message}`);
  }
};

export default handler;

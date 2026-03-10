import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { getAccessToken } from "../../../infra/google-auth.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/google-ads-monitor");

export const GOOGLE_ADS_CHECK_JOB_ID = "google-ads-check";
export const GOOGLE_ADS_WEEKLY_JOB_ID = "google-ads-weekly";

export type GoogleAdsConfig = {
  enabled: boolean;
  customerId: string;
  developerToken: string;
  telegramChatId: string;
  /** CPC alert threshold in cents — default: 200 */
  cpcAlertCents: number;
  /** Day of week for weekly report — default: "MON" */
  weeklyReportDay: string;
  /** Check interval in minutes — default: 60 */
  checkIntervalMinutes: number;
};

export type CampaignMetrics = {
  campaignName: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  cpcMicros: number;
};

type AdsCredentials = {
  developerToken: string;
  customerId: string;
};

const DONNA_DIR = path.join(os.homedir(), ".donna");

function getDefaultAdsConfig(): GoogleAdsConfig {
  return {
    enabled: true,
    customerId: "",
    developerToken: "",
    telegramChatId: "6008067521",
    cpcAlertCents: 200,
    weeklyReportDay: "MON",
    checkIntervalMinutes: 60,
  };
}

export async function loadAdsConfig(): Promise<GoogleAdsConfig> {
  const configPath = path.join(DONNA_DIR, "hooks", "google-ads-monitor", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultAdsConfig(), ...(JSON.parse(raw) as Partial<GoogleAdsConfig>) };
  } catch {
    return getDefaultAdsConfig();
  }
}

export async function loadAdsCredentials(): Promise<AdsCredentials> {
  const credPath = path.join(DONNA_DIR, "google-ads-credentials.json");
  const raw = await fs.readFile(credPath, "utf-8");
  return JSON.parse(raw) as AdsCredentials;
}

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v16/customers";

export async function fetchCampaignMetrics(
  token: string,
  customerId: string,
  developerToken: string,
  dateRange: string,
): Promise<CampaignMetrics[]> {
  const url = `${GOOGLE_ADS_API_BASE}/${customerId}/googleAds:searchStream`;
  const query =
    "SELECT campaign.name, metrics.impressions, metrics.clicks, " +
    "metrics.cost_micros, metrics.conversions, metrics.average_cpc " +
    `FROM campaign WHERE segments.date DURING ${dateRange}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Google Ads API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Array<{
    results?: Array<{
      campaign?: { name?: string };
      metrics?: {
        impressions?: string;
        clicks?: string;
        costMicros?: string;
        conversions?: string;
        averageCpc?: string;
      };
    }>;
  }>;

  const results = data[0]?.results ?? [];
  return results.map((r) => ({
    campaignName: r.campaign?.name ?? "(unknown)",
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    costMicros: Number(r.metrics?.costMicros ?? 0),
    conversions: Number(r.metrics?.conversions ?? 0),
    cpcMicros: Number(r.metrics?.averageCpc ?? 0),
  }));
}

export function checkCpcAlerts(
  metrics: CampaignMetrics[],
  thresholdCents: number,
): CampaignMetrics[] {
  const thresholdMicros = thresholdCents * 10_000;
  return metrics.filter((m) => m.cpcMicros > thresholdMicros);
}

export function formatWeeklyReport(metrics: CampaignMetrics[]): string {
  if (metrics.length === 0) {
    return "Google Ads Weekly Report\n\nNo campaign data available.";
  }

  const totalSpend = metrics.reduce((sum, m) => sum + m.costMicros, 0);
  const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);

  const lines: string[] = [
    "Google Ads Weekly Report",
    "",
    `Total Spend: $${(totalSpend / 1_000_000).toFixed(2)}`,
    `Total Clicks: ${totalClicks}`,
    `Total Impressions: ${totalImpressions}`,
    `Total Conversions: ${totalConversions}`,
    "",
    "Campaigns:",
  ];

  for (const m of metrics) {
    const spend = (m.costMicros / 1_000_000).toFixed(2);
    const cpc = (m.cpcMicros / 1_000_000).toFixed(2);
    lines.push(`  ${m.campaignName}: $${spend} spent, ${m.clicks} clicks, CPC $${cpc}`);
  }

  return lines.join("\n");
}

export function formatCpcAlert(campaign: CampaignMetrics, thresholdCents: number): string {
  const cpcDollars = (campaign.cpcMicros / 1_000_000).toFixed(2);
  const thresholdDollars = (thresholdCents / 100).toFixed(2);
  return (
    `CPC Alert: ${campaign.campaignName}\n` +
    `Current CPC: $${cpcDollars} (threshold: $${thresholdDollars})\n` +
    `Clicks: ${campaign.clicks}, Impressions: ${campaign.impressions}`
  );
}

/** Returns ad spend summary for the morning brief, or null if unavailable. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadAdsConfig();
    if (!config.enabled || !config.customerId) {
      return null;
    }

    const creds = await loadAdsCredentials();
    const token = await getAccessToken();
    const metrics = await fetchCampaignMetrics(
      token,
      creds.customerId,
      creds.developerToken,
      "TODAY",
    );

    const totalSpend = metrics.reduce((sum, m) => sum + m.costMicros, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
    return `Ad spend today: $${(totalSpend / 1_000_000).toFixed(2)}, ${totalClicks} clicks`;
  } catch {
    return null;
  }
}

/** Map day abbreviation to cron day-of-week number. */
function dayToCron(day: string): string {
  const map: Record<string, string> = {
    SUN: "0",
    MON: "1",
    TUE: "2",
    WED: "3",
    THU: "4",
    FRI: "5",
    SAT: "6",
  };
  return map[day.toUpperCase()] ?? "1";
}

function buildAdsCheckJob(config: GoogleAdsConfig): CronJob {
  const intervalMs = (config.checkIntervalMinutes ?? 60) * 60 * 1000;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: GOOGLE_ADS_CHECK_JOB_ID,
    agentId: "main",
    name: "Google Ads CPC Check",
    description: "Check Google Ads campaigns for CPC threshold alerts",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        `Check Google Ads campaigns for customer ${config.customerId}. ` +
        `Alert if any campaign CPC exceeds ${config.cpcAlertCents} cents.`,
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

function buildAdsWeeklyJob(config: GoogleAdsConfig): CronJob {
  const cronDay = dayToCron(config.weeklyReportDay ?? "MON");
  const now = Date.now();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: GOOGLE_ADS_WEEKLY_JOB_ID,
    agentId: "main",
    name: "Google Ads Weekly Report",
    description: "Weekly summary of Google Ads campaign performance",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: `0 9 * * ${cronDay}`, tz },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        `Generate a weekly Google Ads report for customer ${config.customerId}. ` +
        "Include all campaigns with spend, clicks, impressions, conversions, and CPC.",
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
    const config = await loadAdsConfig();
    if (!config.enabled) {
      log.debug("google-ads-monitor hook disabled — skipping registration");
      return;
    }

    if (!config.customerId) {
      log.warn(
        "google-ads-monitor: no customerId configured — set it in ~/.donna/hooks/google-ads-monitor/config.json",
      );
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const checkExists = store.jobs.some((j) => j.id === GOOGLE_ADS_CHECK_JOB_ID);
    const weeklyExists = store.jobs.some((j) => j.id === GOOGLE_ADS_WEEKLY_JOB_ID);

    if (!checkExists) {
      store.jobs.push(buildAdsCheckJob(config));
      log.info(`google-ads-check registered: every ${config.checkIntervalMinutes ?? 60}min`);
    }

    if (!weeklyExists) {
      store.jobs.push(buildAdsWeeklyJob(config));
      log.info(`google-ads-weekly registered: every ${config.weeklyReportDay ?? "MON"} at 09:00`);
    }

    if (checkExists && weeklyExists) {
      log.debug("google-ads-monitor cron jobs already registered — skipping");
      return;
    }

    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured)";
    log.info(`google-ads-monitor registered${chatNote}. Restart the gateway to activate.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register google-ads-monitor cron jobs: ${message}`);
  }
};

export default handler;

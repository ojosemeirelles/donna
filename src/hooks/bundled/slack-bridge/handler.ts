import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/slack-bridge");

export const SLACK_BRIDGE_JOB_ID = "slack-bridge-check";

export interface SlackBridgeConfig {
  enabled: boolean;
  telegramChatId: string;
  checkIntervalMinutes: number;
  watchChannels: string[];
  urgentKeywords: string[];
}

export interface SlackToken {
  botToken: string;
  userToken: string;
}

export interface SlackMessage {
  ts: string;
  channel: string;
  channelName: string;
  user: string;
  userName: string;
  text: string;
  isUrgent: boolean;
}

export function getDefaultSlackConfig(): SlackBridgeConfig {
  return {
    enabled: true,
    telegramChatId: "6008067521",
    checkIntervalMinutes: 10,
    watchChannels: [],
    urgentKeywords: ["urgente", "urgent", "asap", "@here", "@channel"],
  };
}

export async function loadSlackConfig(): Promise<SlackBridgeConfig> {
  const configPath = path.join(os.homedir(), ".donna", "hooks", "slack-bridge", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultSlackConfig(), ...(JSON.parse(raw) as Partial<SlackBridgeConfig>) };
  } catch {
    return getDefaultSlackConfig();
  }
}

export async function loadSlackToken(): Promise<SlackToken | null> {
  const tokenPath = path.join(os.homedir(), ".donna", "slack-token.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    const parsed = JSON.parse(raw) as SlackToken;
    if (!parsed.botToken || !parsed.userToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchChannelHistory(
  token: string,
  channelId: string,
  oldest: string,
): Promise<Array<Record<string, unknown>>> {
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Slack conversations.history failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    messages?: Array<Record<string, unknown>>;
    error?: string;
  };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return data.messages ?? [];
}

export async function fetchUserInfo(
  token: string,
  userId: string,
): Promise<{ name: string; realName: string }> {
  const url = `https://slack.com/api/users.info?user=${userId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Slack users.info failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    user?: { name?: string; real_name?: string };
    error?: string;
  };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return {
    name: (data.user?.name as string) ?? userId,
    realName: (data.user?.real_name as string) ?? userId,
  };
}

export async function fetchChannelInfo(
  token: string,
  channelId: string,
): Promise<{ name: string }> {
  const url = `https://slack.com/api/conversations.info?channel=${channelId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Slack conversations.info failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    channel?: { name?: string };
    error?: string;
  };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return { name: (data.channel?.name as string) ?? channelId };
}

export async function postMessage(token: string, channelId: string, text: string): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  if (!res.ok) {
    throw new Error(`Slack chat.postMessage failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
}

export function classifyUrgency(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function formatSlackDigest(messages: SlackMessage[]): string {
  if (messages.length === 0) {
    return "No new Slack messages.";
  }

  const byChannel = new Map<string, SlackMessage[]>();
  for (const msg of messages) {
    const existing = byChannel.get(msg.channelName) ?? [];
    existing.push(msg);
    byChannel.set(msg.channelName, existing);
  }

  const lines: string[] = ["*Slack Digest*\n"];
  for (const [channel, msgs] of byChannel) {
    lines.push(`*#${channel}* (${msgs.length} messages)`);
    for (const m of msgs) {
      const urgentTag = m.isUrgent ? " [URGENT]" : "";
      lines.push(`  - *${m.userName}*: ${m.text.slice(0, 120)}${urgentTag}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatUrgentSlackAlert(msg: SlackMessage): string {
  return [
    "*URGENT Slack Message*",
    `Channel: #${msg.channelName}`,
    `From: ${msg.userName}`,
    `Message: ${msg.text.slice(0, 300)}`,
  ].join("\n");
}

export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadSlackConfig();
    if (!config.enabled || config.watchChannels.length === 0) {
      return null;
    }
    const token = await loadSlackToken();
    if (!token) {
      return null;
    }

    const since = String((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    let totalMessages = 0;
    const channelCounts: Array<{ name: string; count: number }> = [];

    for (const channelId of config.watchChannels) {
      try {
        const messages = await fetchChannelHistory(token.botToken, channelId, since);
        const info = await fetchChannelInfo(token.botToken, channelId);
        if (messages.length > 0) {
          channelCounts.push({ name: info.name, count: messages.length });
          totalMessages += messages.length;
        }
      } catch (err) {
        log.warn(
          `Failed to fetch channel ${channelId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (totalMessages === 0) {
      return null;
    }

    const channelSummary = channelCounts.map((c) => `#${c.name}: ${c.count}`).join(", ");
    return `Slack: ${totalMessages} unread messages (${channelSummary})`;
  } catch (err) {
    log.warn(
      `Morning brief Slack summary failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function buildSlackBridgeJob(config: SlackBridgeConfig): CronJob {
  const intervalMs = config.checkIntervalMinutes * 60 * 1000;
  const now = Date.now();

  return {
    id: SLACK_BRIDGE_JOB_ID,
    agentId: "main",
    name: "Slack Bridge Check",
    description: "Periodically check Slack channels and forward messages to Telegram",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: [
        "Check Slack channels for new messages since the last check.",
        "For each watched channel, fetch recent messages.",
        "Classify urgency and send a digest or urgent alerts to Telegram.",
      ].join(" "),
      lightContext: true,
      deliver: true,
      channel: "telegram" as const,
      to: config.telegramChatId,
    },
    delivery: {
      mode: "announce" as const,
      channel: "telegram" as const,
      to: config.telegramChatId,
      bestEffort: true,
    },
    failureAlert: false,
    state: {},
  };
}

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const config = await loadSlackConfig();
    if (!config.enabled) {
      log.debug("slack-bridge is disabled — skipping registration");
      return;
    }

    const job = buildSlackBridgeJob(config);

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === SLACK_BRIDGE_JOB_ID);
    if (exists) {
      log.debug("slack-bridge cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    log.info(
      `slack-bridge registered: every ${config.checkIntervalMinutes}m → Telegram ${config.telegramChatId}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register slack-bridge cron job: ${message}`);
  }
};

export default handler;

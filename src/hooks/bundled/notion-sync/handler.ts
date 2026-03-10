import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/notion-sync");

export const NOTION_SYNC_JOB_ID = "notion-sync-check";

export type NotionSyncConfig = {
  enabled: boolean;
  syncIntervalMinutes: number;
  telegramChatId: string;
  databaseIds: string[];
};

export type NotionTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  url: string;
};

function getDefaultNotionConfig(): NotionSyncConfig {
  return {
    enabled: false,
    syncIntervalMinutes: 60,
    telegramChatId: "6008067521",
    databaseIds: [],
  };
}

export async function loadNotionConfig(): Promise<NotionSyncConfig> {
  const donnaDir = path.join(os.homedir(), ".donna");
  const configPath = path.join(donnaDir, "hooks", "notion-sync", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultNotionConfig(), ...(JSON.parse(raw) as Partial<NotionSyncConfig>) };
  } catch {
    return getDefaultNotionConfig();
  }
}

export async function loadNotionToken(): Promise<{ token: string } | null> {
  const tokenPath = path.join(os.homedir(), ".donna", "notion-token.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    return JSON.parse(raw) as { token: string };
  } catch {
    return null;
  }
}

export async function queryDatabase(token: string, databaseId: string): Promise<NotionTask[]> {
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sorts: [{ property: "Status", direction: "ascending" }],
      page_size: 50,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    results: Array<{
      id: string;
      url: string;
      properties: Record<
        string,
        {
          type: string;
          title?: Array<{ plain_text: string }>;
          status?: { name: string };
          select?: { name: string };
          date?: { start: string | null };
        }
      >;
    }>;
  };

  return data.results.map((page) => {
    const titleProp = Object.values(page.properties).find((p) => p.type === "title");
    const statusProp = Object.values(page.properties).find(
      (p) => p.type === "status" || p.type === "select",
    );
    const priorityProp = page.properties["Priority"];
    const dateProp = Object.values(page.properties).find((p) => p.type === "date");

    return {
      id: page.id,
      title: titleProp?.title?.[0]?.plain_text ?? "Untitled",
      status: statusProp?.status?.name ?? statusProp?.select?.name ?? "Unknown",
      priority: priorityProp?.select?.name ?? "None",
      dueDate: dateProp?.date?.start ?? null,
      url: page.url,
    };
  });
}

export async function createTask(token: string, databaseId: string, title: string): Promise<void> {
  const url = "https://api.notion.com/v1/pages";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: title } }],
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion create task error ${res.status}: ${text}`);
  }
}

export async function updateTaskStatus(
  token: string,
  pageId: string,
  status: string,
): Promise<void> {
  const url = `https://api.notion.com/v1/pages/${pageId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        Status: { status: { name: status } },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion update status error ${res.status}: ${text}`);
  }
}

export function formatTaskList(tasks: NotionTask[]): string {
  if (tasks.length === 0) {
    return "No tasks found.";
  }

  const statusEmoji: Record<string, string> = {
    "Not started": "⬜",
    "In progress": "🔵",
    Done: "✅",
    Blocked: "🔴",
  };

  const lines = tasks.map((t) => {
    const emoji = statusEmoji[t.status] ?? "📌";
    const due = t.dueDate ? ` (due: ${t.dueDate})` : "";
    const priority = t.priority !== "None" ? ` [${t.priority}]` : "";
    return `${emoji} *${t.title}*${priority}${due}\n   ${t.status} — [open](${t.url})`;
  });

  return lines.join("\n\n");
}

/** Returns a summary of pending tasks for the morning brief, or null if unavailable. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadNotionConfig();
    if (!config.enabled || config.databaseIds.length === 0) {
      return null;
    }

    const tokenData = await loadNotionToken();
    if (!tokenData) {
      return null;
    }

    let pendingCount = 0;
    for (const dbId of config.databaseIds) {
      try {
        const tasks = await queryDatabase(tokenData.token, dbId);
        pendingCount += tasks.filter((t) => t.status !== "Done" && t.status !== "Completed").length;
      } catch {
        // Skip databases that fail
      }
    }

    if (pendingCount === 0) {
      return null;
    }

    return `You have ${pendingCount} pending task${pendingCount === 1 ? "" : "s"} in Notion.`;
  } catch {
    return null;
  }
}

function buildNotionSyncJob(config: NotionSyncConfig): CronJob {
  const intervalMs = config.syncIntervalMinutes * 60 * 1000;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  const prompt = [
    "Check Notion databases for task updates.",
    "Summarize any new or changed tasks since the last sync.",
    "Report pending, in-progress, and recently completed tasks.",
  ].join(" ");

  return {
    id: NOTION_SYNC_JOB_ID,
    agentId: "main",
    name: "Notion Sync Check",
    description: "Periodically sync and report Notion task updates",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
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
    const config = await loadNotionConfig();

    if (!config.enabled) {
      log.debug("notion-sync hook disabled — skipping cron registration");
      return;
    }

    const job = buildNotionSyncJob(config);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === NOTION_SYNC_JOB_ID);
    if (exists) {
      log.debug("notion-sync cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured — set it in ~/.donna/hooks/notion-sync/config.json)";

    log.info(
      `notion-sync registered: every ${config.syncIntervalMinutes}m${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register notion-sync cron job: ${message}`);
  }
};

export default handler;

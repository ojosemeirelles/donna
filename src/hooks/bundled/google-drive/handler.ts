import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { getAccessToken } from "../../../infra/google-auth.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/google-drive");

export const GOOGLE_DRIVE_JOB_ID = "google-drive-monitor";

export type GoogleDriveConfig = {
  enabled: boolean;
  monitorIntervalMinutes: number;
  telegramChatId: string;
  watchFolderIds: string[];
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  owners: Array<{ displayName: string; emailAddress: string }>;
};

function getDefaultDriveConfig(): GoogleDriveConfig {
  return {
    enabled: false,
    monitorIntervalMinutes: 30,
    telegramChatId: "6008067521",
    watchFolderIds: [],
  };
}

export async function loadDriveConfig(): Promise<GoogleDriveConfig> {
  const donnaDir = path.join(os.homedir(), ".donna");
  const configPath = path.join(donnaDir, "hooks", "google-drive", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultDriveConfig(), ...(JSON.parse(raw) as Partial<GoogleDriveConfig>) };
  } catch {
    return getDefaultDriveConfig();
  }
}

export async function listRecentlyModified(token: string, since: Date): Promise<DriveFile[]> {
  const sinceISO = since.toISOString();
  const query = encodeURIComponent(`modifiedTime>'${sinceISO}'`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime,webViewLink,owners)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=${fields}&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

export async function searchFiles(token: string, query: string): Promise<DriveFile[]> {
  const escapedQuery = query.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name contains '${escapedQuery}' or fullText contains '${escapedQuery}'`,
  );
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime,webViewLink)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=10`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive search error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

export async function uploadFile(
  token: string,
  name: string,
  content: string,
  mimeType: string,
  folderId?: string,
): Promise<void> {
  const metadata: Record<string, unknown> = { name, mimeType };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = "donna_multipart_boundary";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive upload error ${res.status}: ${text}`);
  }
}

export function formatRecentFiles(files: DriveFile[]): string {
  if (files.length === 0) {
    return "No recently modified files.";
  }

  const mimeEmoji: Record<string, string> = {
    "application/vnd.google-apps.document": "📄",
    "application/vnd.google-apps.spreadsheet": "📊",
    "application/vnd.google-apps.presentation": "📽",
    "application/vnd.google-apps.folder": "📁",
    "application/pdf": "📕",
    "image/png": "🖼",
    "image/jpeg": "🖼",
  };

  const lines = files.map((f) => {
    const emoji = mimeEmoji[f.mimeType] ?? "📎";
    const owner = f.owners?.[0]?.displayName ?? "Unknown";
    const modified = new Date(f.modifiedTime).toLocaleString();
    return `${emoji} *${f.name}*\n   Modified: ${modified} by ${owner}\n   [open](${f.webViewLink})`;
  });

  return lines.join("\n\n");
}

/** Returns a summary of recently modified files for the morning brief, or null if unavailable. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadDriveConfig();
    if (!config.enabled) {
      return null;
    }

    let token: string;
    try {
      token = await getAccessToken();
    } catch {
      return null;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const files = await listRecentlyModified(token, since);

    if (files.length === 0) {
      return null;
    }

    return `${files.length} file${files.length === 1 ? "" : "s"} modified in Google Drive in the last 24h.`;
  } catch {
    return null;
  }
}

function buildDriveMonitorJob(config: GoogleDriveConfig): CronJob {
  const intervalMs = config.monitorIntervalMinutes * 60 * 1000;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  const prompt = [
    "Check Google Drive for recently modified files.",
    "Report any new or changed documents since the last check.",
    "Include file names, owners, and modification times.",
  ].join(" ");

  return {
    id: GOOGLE_DRIVE_JOB_ID,
    agentId: "main",
    name: "Google Drive Monitor",
    description: "Periodically check Google Drive for file changes",
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
    const config = await loadDriveConfig();

    if (!config.enabled) {
      log.debug("google-drive hook disabled — skipping cron registration");
      return;
    }

    const job = buildDriveMonitorJob(config);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === GOOGLE_DRIVE_JOB_ID);
    if (exists) {
      log.debug("google-drive cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured — set it in ~/.donna/hooks/google-drive/config.json)";

    log.info(
      `google-drive registered: every ${config.monitorIntervalMinutes}m${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register google-drive cron job: ${message}`);
  }
};

export default handler;

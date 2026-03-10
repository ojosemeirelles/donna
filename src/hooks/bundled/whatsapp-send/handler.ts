import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/whatsapp-send");

export type WhatsAppSendConfig = {
  enabled: boolean;
  telegramChatId: string;
  requireConfirmation: boolean;
  gatewayPort: number;
};

export type WhatsAppMessage = {
  to: string;
  message: string;
  timestamp: number;
  status: "sent" | "failed" | "pending_confirmation";
};

export type WhatsAppLog = {
  messages: WhatsAppMessage[];
};

function getDefaultWhatsAppConfig(): WhatsAppSendConfig {
  return {
    enabled: false,
    telegramChatId: "6008067521",
    requireConfirmation: true,
    gatewayPort: 18789,
  };
}

export async function loadWhatsAppConfig(): Promise<WhatsAppSendConfig> {
  const donnaDir = path.join(os.homedir(), ".donna");
  const configPath = path.join(donnaDir, "hooks", "whatsapp-send", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultWhatsAppConfig(), ...(JSON.parse(raw) as Partial<WhatsAppSendConfig>) };
  } catch {
    return getDefaultWhatsAppConfig();
  }
}

export async function loadMessageLog(): Promise<WhatsAppLog> {
  const logPath = path.join(os.homedir(), ".donna", "whatsapp-log.json");
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    return JSON.parse(raw) as WhatsAppLog;
  } catch {
    return { messages: [] };
  }
}

export async function saveMessageLog(msgLog: WhatsAppLog): Promise<void> {
  const logPath = path.join(os.homedir(), ".donna", "whatsapp-log.json");
  await fs.writeFile(logPath, JSON.stringify(msgLog, null, 2) + "\n", "utf-8");
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  config: WhatsAppSendConfig,
): Promise<WhatsAppMessage> {
  const entry: WhatsAppMessage = {
    to,
    message,
    timestamp: Date.now(),
    status: "pending_confirmation",
  };

  try {
    const url = `http://localhost:${config.gatewayPort}/api/send`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "whatsapp", to, message }),
    });

    if (!res.ok) {
      const text = await res.text();
      entry.status = "failed";
      log.error(`WhatsApp send failed ${res.status}: ${text}`);
    } else {
      entry.status = "sent";
      log.info(`WhatsApp message sent to ${to}`);
    }
  } catch (err) {
    entry.status = "failed";
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(`WhatsApp send error: ${errMsg}`);
  }

  // Log the message
  const msgLog = await loadMessageLog();
  msgLog.messages.push(entry);
  await saveMessageLog(msgLog);

  return entry;
}

export function formatConfirmation(to: string, message: string): string {
  const preview = message.length > 200 ? message.slice(0, 200) + "..." : message;
  return [
    "Confirm WhatsApp message:",
    "",
    `*To:* ${to}`,
    `*Message:*`,
    preview,
    "",
    "Reply YES to send or NO to cancel.",
  ].join("\n");
}

/** WhatsApp send is on-demand only — no periodic data for the morning brief. */
export async function getMorningBriefSummary(): Promise<null> {
  return null;
}

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const config = await loadWhatsAppConfig();

    if (!config.enabled) {
      log.debug("whatsapp-send hook disabled");
      return;
    }

    log.info(
      `whatsapp-send hook available — gateway port ${config.gatewayPort}, confirmation ${config.requireConfirmation ? "required" : "disabled"}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`whatsapp-send hook init error: ${message}`);
  }
};

export default handler;

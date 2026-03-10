/**
 * Gmail VIP Manager — manages VIP senders for urgent email classification.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_PATH = path.join(os.homedir(), ".donna", "hooks", "gmail-watch", "config.json");

export type GmailWatchConfig = {
  enabled: boolean;
  checkIntervalMinutes: number;
  vipSenders: string[];
  urgentKeywords: string[];
  telegramChatId: string;
  actionDigestIntervalMinutes: number;
};

export async function loadGmailConfig(): Promise<GmailWatchConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as GmailWatchConfig;
  } catch {
    return getDefaultConfig();
  }
}

export function getDefaultConfig(): GmailWatchConfig {
  return {
    enabled: true,
    checkIntervalMinutes: 5,
    vipSenders: [],
    urgentKeywords: [
      "urgente",
      "urgent",
      "asap",
      "deadline",
      "prazo",
      "hoje",
      "agora",
      "importante",
    ],
    telegramChatId: "6008067521",
    actionDigestIntervalMinutes: 120,
  };
}

export async function saveGmailConfig(config: GmailWatchConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export async function addVipSender(email: string): Promise<string> {
  const config = await loadGmailConfig();
  const normalized = email.toLowerCase().trim();

  if (config.vipSenders.includes(normalized)) {
    return `${normalized} já é VIP.`;
  }

  config.vipSenders.push(normalized);
  await saveGmailConfig(config);
  return `✅ ${normalized} adicionado como VIP. Emails desse remetente serão sempre classificados como URGENTE.`;
}

export async function removeVipSender(email: string): Promise<string> {
  const config = await loadGmailConfig();
  const normalized = email.toLowerCase().trim();
  const idx = config.vipSenders.indexOf(normalized);

  if (idx === -1) {
    return `${normalized} não está na lista VIP.`;
  }

  config.vipSenders.splice(idx, 1);
  await saveGmailConfig(config);
  return `✅ ${normalized} removido da lista VIP.`;
}

export async function listVipSenders(): Promise<string[]> {
  const config = await loadGmailConfig();
  return config.vipSenders;
}

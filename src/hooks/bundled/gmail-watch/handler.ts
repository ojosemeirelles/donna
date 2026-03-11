/**
 * Gmail Watch Hook — polls Gmail for unread emails, classifies urgency,
 * sends Telegram alerts for urgent messages and periodic digests for action items.
 */

import os from "node:os";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { loadGmailConfig, type GmailWatchConfig } from "../../../infra/gmail-vip.js";
import {
  getAccessToken,
  fetchEmailDetail,
  loadTokens,
  type EmailDetail,
} from "../../../infra/google-auth.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/gmail-watch");

const GMAIL_CHECK_JOB_ID = "gmail-watch-check";
const GMAIL_DIGEST_JOB_ID = "gmail-watch-digest";

export type EmailClassification = "URGENT" | "ACTION" | "WAIT";

export type ClassifiedEmail = EmailDetail & {
  classification: EmailClassification;
  reason: string;
};

/** Classify a single email based on config rules. */
export function classifyEmail(email: EmailDetail, config: GmailWatchConfig): ClassifiedEmail {
  const fromLower = email.from.toLowerCase();
  const subjectLower = email.subject.toLowerCase();
  const snippetLower = email.snippet.toLowerCase();
  const combined = `${subjectLower} ${snippetLower}`;

  // VIP sender check
  for (const vip of config.vipSenders) {
    if (fromLower.includes(vip.toLowerCase())) {
      return { ...email, classification: "URGENT", reason: `VIP: ${vip}` };
    }
  }

  // Urgent keyword check
  for (const keyword of config.urgentKeywords) {
    if (combined.includes(keyword.toLowerCase())) {
      return { ...email, classification: "URGENT", reason: `Keyword: ${keyword}` };
    }
  }

  // Auto-detect patterns for WAIT
  const waitPatterns = [
    /newsletter/i,
    /unsubscribe/i,
    /noreply/i,
    /no-reply/i,
    /notification/i,
    /donotreply/i,
    /marketing/i,
    /promo/i,
    /digest/i,
    /weekly update/i,
    /github\.com\/notifications/i,
  ];

  for (const pattern of waitPatterns) {
    if (pattern.test(fromLower) || pattern.test(combined)) {
      return { ...email, classification: "WAIT", reason: "Auto: newsletter/notification" };
    }
  }

  // Default: ACTION (needs response but not urgent)
  return { ...email, classification: "ACTION", reason: "Default: requires review" };
}

/** Fetch unread emails from Gmail and classify them. Returns empty if not authenticated. */
export async function checkAndClassifyEmails(config: GmailWatchConfig): Promise<ClassifiedEmail[]> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    log.warn(
      "gmail-watch: cannot get access token — skipping check. Run: npx tsx src/infra/google-auth.ts",
    );
    return [];
  }

  const url =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread+in:inbox";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  if (!data.messages?.length) {
    return [];
  }

  const classified: ClassifiedEmail[] = [];
  for (const msg of data.messages) {
    const detail = await fetchEmailDetail(token, msg.id);
    classified.push(classifyEmail(detail, config));
  }

  return classified;
}

/** Format urgent email alert for Telegram. */
export function formatUrgentAlert(email: ClassifiedEmail): string {
  const fromName = email.from.replace(/<.*>/, "").trim() || email.from;
  const lines = [
    `🔴 *Email urgente* de ${fromName}`,
    `📌 *Assunto:* ${escapeMarkdown(email.subject)}`,
    `📝 *Resumo:* ${escapeMarkdown(email.snippet.slice(0, 200))}`,
    `⚡ *Razao:* ${email.reason}`,
    "",
    `_Acao sugerida: responder com prioridade_`,
  ];
  return lines.join("\n");
}

/** Format action digest for Telegram. */
export function formatActionDigest(emails: ClassifiedEmail[]): string {
  if (emails.length === 0) {
    return "";
  }

  const lines = [`📬 *${emails.length} email(s) pendente(s) — resumo:*`, ""];

  for (const email of emails.slice(0, 10)) {
    const fromName = email.from.replace(/<.*>/, "").trim() || email.from;
    lines.push(`• *${escapeMarkdown(fromName)}* — ${escapeMarkdown(email.subject)}`);
  }

  if (emails.length > 10) {
    lines.push(`_...e mais ${emails.length - 10} emails_`);
  }

  return lines.join("\n");
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

/** Build the cron job for periodic Gmail checking. */
function buildGmailCheckJob(config: GmailWatchConfig): CronJob {
  const intervalMin = config.checkIntervalMinutes ?? 5;
  const cronExpr = `*/${intervalMin} * * * *`;
  const now = Date.now();

  const prompt = [
    "You are Donna. Check Gmail for new unread emails using the gmail-watch hook.",
    "Run the gmail check, classify each email (URGENT/ACTION/WAIT).",
    "For URGENT emails, send an immediate Telegram alert to the configured chat.",
    "For ACTION emails, note them for the periodic digest.",
    "WAIT emails are silently ignored.",
    "Use the gmail-watch tools available in your hooks.",
  ].join("\n");

  return {
    id: GMAIL_CHECK_JOB_ID,
    agentId: "main",
    name: "Gmail Watch",
    description: "Check Gmail for unread emails and classify urgency",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: "cron",
      expr: cronExpr,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: prompt,
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

/** Build digest job (runs every 2h by default). */
function buildDigestJob(config: GmailWatchConfig): CronJob {
  const intervalMin = config.actionDigestIntervalMinutes ?? 120;
  const hours = Math.floor(intervalMin / 60);
  const cronExpr = hours >= 1 ? `0 */${hours} * * *` : `*/${intervalMin} * * * *`;
  const now = Date.now();

  return {
    id: GMAIL_DIGEST_JOB_ID,
    agentId: "main",
    name: "Gmail Action Digest",
    description: "Periodic digest of ACTION emails",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: "cron",
      expr: cronExpr,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        "Check for ACTION-classified emails and send a digest summary to Telegram if any are pending.",
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

/**
 * Register gmail-watch cron jobs on gateway startup.
 * Creates two jobs: periodic check (every 5min) and action digest (every 2h).
 */
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    resolveStateDir(process.env, os.homedir); // ensure state dir exists
    const config = await loadGmailConfig();

    if (!config.enabled) {
      log.info("gmail-watch disabled in config — skipping registration");
      return;
    }

    // Guard: skip if no OAuth tokens are configured (user hasn't run auth flow yet)
    const tokens = await loadTokens();
    if (!tokens) {
      log.info(
        "gmail-watch: no OAuth tokens found — skipping. Run: npx tsx src/infra/google-auth.ts",
      );
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    // Register check job
    const checkExists = store.jobs.some((j) => j.id === GMAIL_CHECK_JOB_ID);
    if (!checkExists) {
      store.jobs.push(buildGmailCheckJob(config));
      log.info(`gmail-watch check job registered: every ${config.checkIntervalMinutes ?? 5} min`);
    }

    // Register digest job
    const digestExists = store.jobs.some((j) => j.id === GMAIL_DIGEST_JOB_ID);
    if (!digestExists) {
      store.jobs.push(buildDigestJob(config));
      log.info(
        `gmail-watch digest job registered: every ${config.actionDigestIntervalMinutes ?? 120} min`,
      );
    }

    if (checkExists && digestExists) {
      log.debug("gmail-watch jobs already registered — skipping");
      return;
    }

    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` → Telegram ${config.telegramChatId}`
      : " (no telegramChatId — set in ~/.donna/hooks/gmail-watch/config.json)";
    log.info(`gmail-watch registered${chatNote}. Restart gateway to activate.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register gmail-watch: ${message}`);
  }
};

export default handler;

/**
 * Stripe Monitor Hook — tracks payments, monitors high-value charges,
 * sends daily financial summaries and real-time alerts via Telegram.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/stripe-monitor");

export const STRIPE_CHECK_JOB_ID = "stripe-check";
export const STRIPE_DAILY_JOB_ID = "stripe-daily";

export type StripeMonitorConfig = {
  enabled: boolean;
  /** Alert threshold in cents — default: 5000 (50 EUR/USD) */
  alertThresholdCents: number;
  /** Check interval in minutes — default: 15 */
  checkIntervalMinutes: number;
  telegramChatId: string;
  /** Cron expression for daily summary — default: "0 9 * * *" */
  dailySummaryTime: string;
};

export type StripeKeyFile = {
  secretKey: string;
};

export type StripeCharge = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created: number;
  customerEmail: string | null;
};

export type StripeBalance = {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
};

export type StripeSubscription = {
  id: string;
  status: string;
  planAmount: number;
  planCurrency: string;
  planInterval: string;
};

type StripeChargeApiResponse = {
  data?: Array<{
    id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    description?: string | null;
    created?: number;
    receipt_email?: string | null;
  }>;
};

type StripeBalanceApiResponse = {
  available?: Array<{ amount?: number; currency?: string }>;
  pending?: Array<{ amount?: number; currency?: string }>;
};

type StripeSubscriptionApiResponse = {
  data?: Array<{
    id?: string;
    status?: string;
    items?: {
      data?: Array<{
        plan?: {
          amount?: number;
          currency?: string;
          interval?: string;
        };
      }>;
    };
  }>;
};

export function getDefaultStripeConfig(): StripeMonitorConfig {
  return {
    enabled: false,
    alertThresholdCents: 5000,
    checkIntervalMinutes: 15,
    telegramChatId: "6008067521",
    dailySummaryTime: "0 9 * * *",
  };
}

export async function loadStripeConfig(stateDir?: string): Promise<StripeMonitorConfig> {
  const dir = stateDir ?? path.join(os.homedir(), ".donna");
  const configPath = path.join(dir, "hooks", "stripe-monitor", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StripeMonitorConfig>;
    return { ...getDefaultStripeConfig(), ...parsed };
  } catch {
    return getDefaultStripeConfig();
  }
}

export async function loadStripeKey(): Promise<StripeKeyFile> {
  const keyPath = path.join(os.homedir(), ".donna", "stripe-key.json");
  try {
    const raw = await fs.readFile(keyPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StripeKeyFile>;
    if (!parsed.secretKey) {
      throw new Error("Missing secretKey in stripe-key.json");
    }
    return { secretKey: parsed.secretKey };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load Stripe key from ~/.donna/stripe-key.json: ${message}`, {
      cause: err,
    });
  }
}

/** Fetch recent charges since a given date. */
export async function getRecentPayments(since: Date): Promise<StripeCharge[]> {
  const { secretKey } = await loadStripeKey();
  const unixTimestamp = Math.floor(since.getTime() / 1000);

  const params = new URLSearchParams({
    "created[gte]": String(unixTimestamp),
    limit: "50",
  });

  const res = await fetch(`https://api.stripe.com/v1/charges?${params.toString()}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as StripeChargeApiResponse;
  return (data.data ?? []).map((charge) => ({
    id: charge.id ?? "",
    amount: charge.amount ?? 0,
    currency: charge.currency ?? "eur",
    status: charge.status ?? "unknown",
    description: charge.description ?? null,
    created: charge.created ?? 0,
    customerEmail: charge.receipt_email ?? null,
  }));
}

/** Fetch current Stripe balance. */
export async function getBalance(): Promise<StripeBalance> {
  const { secretKey } = await loadStripeKey();

  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe balance error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as StripeBalanceApiResponse;
  return {
    available: (data.available ?? []).map((b) => ({
      amount: b.amount ?? 0,
      currency: b.currency ?? "eur",
    })),
    pending: (data.pending ?? []).map((b) => ({
      amount: b.amount ?? 0,
      currency: b.currency ?? "eur",
    })),
  };
}

/** Estimate MRR from active subscriptions. */
export async function getMRR(): Promise<number> {
  const { secretKey } = await loadStripeKey();

  const params = new URLSearchParams({
    status: "active",
    limit: "100",
  });

  const res = await fetch(`https://api.stripe.com/v1/subscriptions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe subscriptions error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as StripeSubscriptionApiResponse;
  let totalMonthly = 0;

  for (const sub of data.data ?? []) {
    for (const item of sub.items?.data ?? []) {
      const plan = item.plan;
      if (!plan?.amount) {
        continue;
      }

      switch (plan.interval) {
        case "month":
          totalMonthly += plan.amount;
          break;
        case "year":
          totalMonthly += Math.round(plan.amount / 12);
          break;
        case "week":
          totalMonthly += Math.round(plan.amount * 4.33);
          break;
        case "day":
          totalMonthly += Math.round(plan.amount * 30);
          break;
      }
    }
  }

  return totalMonthly;
}

function formatCurrency(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  const symbol = currency.toUpperCase();
  return `${amount} ${symbol}`;
}

/** Format a high-value payment alert for Telegram. */
export function formatPaymentAlert(charge: StripeCharge): string {
  const lines = [
    `*Pagamento de alto valor recebido*`,
    "",
    `  *Valor:* ${formatCurrency(charge.amount, charge.currency)}`,
    `  *Status:* ${charge.status}`,
  ];

  if (charge.description) {
    lines.push(`  *Descricao:* ${charge.description}`);
  }

  if (charge.customerEmail) {
    lines.push(`  *Cliente:* ${charge.customerEmail}`);
  }

  const date = new Date(charge.created * 1000);
  lines.push(`  *Data:* ${date.toLocaleString("pt-BR")}`);

  return lines.join("\n");
}

/** Format daily financial summary for Telegram. */
export function formatDailySummary(
  payments: StripeCharge[],
  balance: StripeBalance,
  mrr: number,
): string {
  const lines: string[] = [];

  lines.push("*Resumo financeiro diario:*");
  lines.push("");

  // Revenue today
  const successfulPayments = payments.filter((p) => p.status === "succeeded");
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const currency = successfulPayments[0]?.currency ?? "eur";

  lines.push(`  *Pagamentos hoje:* ${successfulPayments.length}`);
  lines.push(`  *Receita do dia:* ${formatCurrency(totalRevenue, currency)}`);
  lines.push("");

  // Balance
  for (const bal of balance.available) {
    lines.push(`  *Saldo disponivel:* ${formatCurrency(bal.amount, bal.currency)}`);
  }
  for (const bal of balance.pending) {
    if (bal.amount > 0) {
      lines.push(`  *Saldo pendente:* ${formatCurrency(bal.amount, bal.currency)}`);
    }
  }
  lines.push("");

  // MRR
  lines.push(`  *MRR estimado:* ${formatCurrency(mrr, currency)}`);

  if (successfulPayments.length > 0) {
    lines.push("");
    lines.push("*Ultimos pagamentos:*");
    for (const p of successfulPayments.slice(0, 5)) {
      const desc = p.description ?? p.customerEmail ?? p.id;
      lines.push(`  ${formatCurrency(p.amount, p.currency)} — ${desc}`);
    }
  }

  return lines.join("\n");
}

/** Morning brief integration — returns revenue/payment summary or null. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadStripeConfig();
    if (!config.enabled) {
      return null;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const payments = await getRecentPayments(yesterday);
    const successful = payments.filter((p) => p.status === "succeeded");

    if (successful.length === 0) {
      return null;
    }

    const total = successful.reduce((sum, p) => sum + p.amount, 0);
    const currency = successful[0]?.currency ?? "eur";

    return `${successful.length} pagamento(s) nas ultimas 24h — total: ${formatCurrency(total, currency)}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`morning brief stripe summary failed: ${message}`);
    return null;
  }
}

/** Build the high-value payment check prompt. */
function buildCheckPrompt(config: StripeMonitorConfig): string {
  return [
    "You are Donna. Check Stripe for new high-value payments using the stripe-monitor hook.",
    `Alert threshold: ${formatCurrency(config.alertThresholdCents, "eur")}.`,
    "For payments above the threshold, send an immediate Telegram alert.",
    "Include amount, customer email, and description.",
    "If no high-value payments found, stay silent.",
  ].join("\n");
}

/** Build the daily financial summary prompt. */
function buildDailySummaryPrompt(): string {
  return [
    "You are Donna. Generate a daily Stripe financial summary using the stripe-monitor hook.",
    "Include: total payments today, revenue, current balance, estimated MRR.",
    "Format with emojis for Telegram delivery.",
    "List top 5 payments of the day.",
  ].join("\n");
}

/** Build CronJob for periodic high-value payment check. */
function buildStripeCheckJob(config: StripeMonitorConfig): CronJob {
  const intervalMin = config.checkIntervalMinutes;
  const cronExpr = `*/${intervalMin} * * * *`;
  const now = Date.now();

  return {
    id: STRIPE_CHECK_JOB_ID,
    agentId: "main",
    name: "Stripe Payment Check",
    description: "Check for high-value Stripe payments",
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
      message: buildCheckPrompt(config),
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

/** Build CronJob for daily financial summary. */
function buildStripeDailyJob(config: StripeMonitorConfig): CronJob {
  const now = Date.now();

  return {
    id: STRIPE_DAILY_JOB_ID,
    agentId: "main",
    name: "Stripe Daily Summary",
    description: "Daily financial summary from Stripe",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: "cron",
      expr: config.dailySummaryTime,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: buildDailySummaryPrompt(),
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
 * Register stripe-monitor cron jobs on gateway startup.
 * Creates two jobs: periodic check and daily summary.
 */
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const stateDir = resolveStateDir(process.env, os.homedir);
    const config = await loadStripeConfig(stateDir);

    if (!config.enabled) {
      log.info("stripe-monitor disabled in config — skipping registration");
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    // Register check job
    const checkExists = store.jobs.some((j) => j.id === STRIPE_CHECK_JOB_ID);
    if (!checkExists) {
      store.jobs.push(buildStripeCheckJob(config));
      log.info(`stripe-check job registered: every ${config.checkIntervalMinutes} min`);
    }

    // Register daily summary job
    const dailyExists = store.jobs.some((j) => j.id === STRIPE_DAILY_JOB_ID);
    if (!dailyExists) {
      store.jobs.push(buildStripeDailyJob(config));
      log.info(`stripe-daily job registered: ${config.dailySummaryTime}`);
    }

    if (checkExists && dailyExists) {
      log.debug("stripe-monitor jobs already registered — skipping");
      return;
    }

    await saveCronStore(storePath, store);

    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId — set in ~/.donna/hooks/stripe-monitor/config.json)";
    log.info(`stripe-monitor registered${chatNote}. Restart gateway to activate.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register stripe-monitor: ${message}`);
  }
};

export default handler;

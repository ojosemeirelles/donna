import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/shopify-dashboard");

export const SHOPIFY_CHECK_JOB_ID = "shopify-check";
export const SHOPIFY_DAILY_JOB_ID = "shopify-daily";

export interface ShopifyConfig {
  enabled: boolean;
  shopDomain: string;
  telegramChatId: string;
  checkIntervalMinutes: number;
  lowStockThreshold: number;
  dailySummaryTime: string;
}

export interface ShopifyToken {
  accessToken: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  variants: Array<{
    id: string;
    title: string;
    inventoryQuantity: number;
  }>;
}

export interface LowStockItem {
  product: string;
  variant: string;
  quantity: number;
}

export function getDefaultShopifyConfig(): ShopifyConfig {
  return {
    enabled: true,
    shopDomain: "",
    telegramChatId: "6008067521",
    checkIntervalMinutes: 30,
    lowStockThreshold: 5,
    dailySummaryTime: "0 9 * * *",
  };
}

export async function loadShopifyConfig(): Promise<ShopifyConfig> {
  const configPath = path.join(os.homedir(), ".donna", "hooks", "shopify-dashboard", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultShopifyConfig(), ...(JSON.parse(raw) as Partial<ShopifyConfig>) };
  } catch {
    return getDefaultShopifyConfig();
  }
}

export async function loadShopifyToken(): Promise<ShopifyToken | null> {
  const tokenPath = path.join(os.homedir(), ".donna", "shopify-token.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    const parsed = JSON.parse(raw) as ShopifyToken;
    if (!parsed.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchRecentOrders(
  token: string,
  domain: string,
  since: string,
): Promise<ShopifyOrder[]> {
  const url = `https://${domain}/admin/api/2024-01/orders.json?created_at_min=${since}&status=any&limit=50`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) {
    throw new Error(`Shopify orders fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { orders?: Array<Record<string, unknown>> };
  return (data.orders ?? []).map((o) => ({
    id: String(o.id),
    name: (o.name as string) ?? "",
    totalPrice: (o.total_price as string) ?? "0",
    currency: (o.currency as string) ?? "USD",
    createdAt: (o.created_at as string) ?? "",
    financialStatus: (o.financial_status as string) ?? "unknown",
    fulfillmentStatus: (o.fulfillment_status as string | null) ?? null,
  }));
}

export async function fetchProducts(token: string, domain: string): Promise<ShopifyProduct[]> {
  const url = `https://${domain}/admin/api/2024-01/products.json?limit=100`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) {
    throw new Error(`Shopify products fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { products?: Array<Record<string, unknown>> };
  return (data.products ?? []).map((p) => ({
    id: String(p.id),
    title: (p.title as string) ?? "",
    variants: ((p.variants as Array<Record<string, unknown>>) ?? []).map((v) => ({
      id: String(v.id),
      title: (v.title as string) ?? "Default",
      inventoryQuantity: (v.inventory_quantity as number) ?? 0,
    })),
  }));
}

export function getLowStockProducts(products: ShopifyProduct[], threshold: number): LowStockItem[] {
  const items: LowStockItem[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.inventoryQuantity <= threshold) {
        items.push({
          product: product.title,
          variant: variant.title,
          quantity: variant.inventoryQuantity,
        });
      }
    }
  }
  return items;
}

export function calculateDailyRevenue(orders: ShopifyOrder[]): number {
  let total = 0;
  for (const order of orders) {
    const price = Number.parseFloat(order.totalPrice);
    if (!Number.isNaN(price)) {
      total += price;
    }
  }
  return total;
}

export function formatDailySummary(
  orders: ShopifyOrder[],
  revenue: number,
  lowStock: LowStockItem[],
): string {
  const lines: string[] = ["*Shopify Daily Summary*\n"];

  lines.push(`Orders today: ${orders.length}`);
  lines.push(`Revenue: $${revenue.toFixed(2)}`);

  const pending = orders.filter((o) => !o.fulfillmentStatus || o.fulfillmentStatus === "null");
  if (pending.length > 0) {
    lines.push(`\nPending fulfillment: ${pending.length}`);
    for (const order of pending.slice(0, 5)) {
      lines.push(`  - ${order.name} ($${order.totalPrice})`);
    }
  }

  if (lowStock.length > 0) {
    lines.push(`\nLow stock items (${lowStock.length}):`);
    for (const item of lowStock.slice(0, 10)) {
      lines.push(`  - ${item.product} (${item.variant}): ${item.quantity} left`);
    }
  }

  return lines.join("\n");
}

export function formatLowStockAlert(items: LowStockItem[]): string {
  const lines: string[] = ["*Low Stock Alert*\n"];
  for (const item of items) {
    const emoji = item.quantity === 0 ? "!!!" : "!";
    lines.push(`[${emoji}] ${item.product} — ${item.variant}: ${item.quantity} remaining`);
  }
  return lines.join("\n");
}

export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadShopifyConfig();
    if (!config.enabled || !config.shopDomain) {
      return null;
    }
    const tokenData = await loadShopifyToken();
    if (!tokenData) {
      return null;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const orders = await fetchRecentOrders(tokenData.accessToken, config.shopDomain, since);
      const revenue = calculateDailyRevenue(orders);
      return `Shopify: ${orders.length} orders, $${revenue.toFixed(2)} revenue (last 24h)`;
    } catch (err) {
      log.warn(`Failed to fetch Shopify data: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  } catch (err) {
    log.warn(
      `Morning brief Shopify summary failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function buildShopifyCheckJob(config: ShopifyConfig): CronJob {
  const intervalMs = config.checkIntervalMinutes * 60 * 1000;
  const now = Date.now();

  return {
    id: SHOPIFY_CHECK_JOB_ID,
    agentId: "main",
    name: "Shopify Stock Check",
    description: "Periodically check Shopify inventory for low stock alerts",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: "Check Shopify inventory levels and send alerts for low stock items.",
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

function buildShopifyDailyJob(config: ShopifyConfig): CronJob {
  const now = Date.now();

  return {
    id: SHOPIFY_DAILY_JOB_ID,
    agentId: "main",
    name: "Shopify Daily Summary",
    description: "Daily Shopify summary with orders, revenue, and stock status",
    enabled: true,
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
      message: "Generate the daily Shopify summary with orders, revenue, and inventory status.",
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
    const config = await loadShopifyConfig();
    if (!config.enabled) {
      log.debug("shopify-dashboard is disabled — skipping registration");
      return;
    }

    if (!config.shopDomain) {
      log.warn(
        "shopify-dashboard: no shopDomain configured — skipping. Set it in ~/.donna/hooks/shopify-dashboard/config.json",
      );
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    let registered = false;

    if (!store.jobs.some((j) => j.id === SHOPIFY_CHECK_JOB_ID)) {
      store.jobs.push(buildShopifyCheckJob(config));
      registered = true;
      log.info(
        `shopify-check registered: every ${config.checkIntervalMinutes}m → Telegram ${config.telegramChatId}`,
      );
    } else {
      log.debug("shopify-check cron job already registered — skipping");
    }

    if (!store.jobs.some((j) => j.id === SHOPIFY_DAILY_JOB_ID)) {
      store.jobs.push(buildShopifyDailyJob(config));
      registered = true;
      log.info(
        `shopify-daily registered: ${config.dailySummaryTime} → Telegram ${config.telegramChatId}`,
      );
    } else {
      log.debug("shopify-daily cron job already registered — skipping");
    }

    if (registered) {
      await saveCronStore(storePath, store);
      log.info("shopify-dashboard cron jobs saved. Restart the gateway to activate.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register shopify-dashboard cron jobs: ${message}`);
  }
};

export default handler;

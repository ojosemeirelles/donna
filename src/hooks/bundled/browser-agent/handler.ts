/**
 * Browser Agent Hook — on-demand browser automation integration.
 * Registers availability for the orchestrator but does NOT create cron jobs.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/browser-agent");

export type BrowserAgentConfig = {
  enabled: boolean;
  /** Port for browser automation service — default: 18791 */
  port: number;
  telegramChatId: string;
  /** Require confirmation before purchases/form submissions — default: true */
  requireConfirmation: boolean;
  /** Maximum budget in cents for purchases — default: 10000 (100 EUR) */
  maxBudgetCents: number;
};

export function getDefaultBrowserConfig(): BrowserAgentConfig {
  return {
    enabled: false,
    port: 18791,
    telegramChatId: "6008067521",
    requireConfirmation: true,
    maxBudgetCents: 10000,
  };
}

export async function loadBrowserConfig(stateDir?: string): Promise<BrowserAgentConfig> {
  const dir = stateDir ?? path.join(os.homedir(), ".donna");
  const configPath = path.join(dir, "hooks", "browser-agent", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BrowserAgentConfig>;
    return { ...getDefaultBrowserConfig(), ...parsed };
  } catch {
    return getDefaultBrowserConfig();
  }
}

/** Check if the browser automation service is listening on the configured port. */
export async function isBrowserAgentAvailable(config?: BrowserAgentConfig): Promise<boolean> {
  const cfg = config ?? (await loadBrowserConfig());
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://localhost:${cfg.port}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/** Build a prompt for general browser automation. */
export function buildBrowsePrompt(query: string): string {
  return [
    "You are Donna. Use the browser agent to perform the following task:",
    "",
    `Task: ${query}`,
    "",
    "Instructions:",
    "- Navigate to relevant pages",
    "- Extract the requested information",
    "- Report findings clearly",
    "- Do NOT submit forms or make purchases without explicit confirmation",
  ].join("\n");
}

/** Build a shopping prompt with budget constraints. */
export function buildShoppingPrompt(
  product: string,
  maxPriceCents: number,
  config: BrowserAgentConfig,
): string {
  const maxPrice = (maxPriceCents / 100).toFixed(2);
  const budgetLimit = (config.maxBudgetCents / 100).toFixed(2);

  return [
    "You are Donna. Use the browser agent to search for a product:",
    "",
    `Product: ${product}`,
    `Max price: ${maxPrice} EUR`,
    `Budget limit: ${budgetLimit} EUR`,
    "",
    "Instructions:",
    "- Search multiple stores for the best price",
    "- Compare at least 3 options",
    "- Present findings with prices and links",
    config.requireConfirmation
      ? "- STOP before purchasing — ask for explicit confirmation first"
      : "- Auto-purchase is enabled if within budget",
    `- Never exceed budget limit of ${budgetLimit} EUR`,
  ].join("\n");
}

/** Determine if an action requires user confirmation. */
export function requiresConfirmation(action: string, config: BrowserAgentConfig): boolean {
  if (!config.requireConfirmation) {
    return false;
  }

  const confirmActions = [
    "purchase",
    "buy",
    "checkout",
    "submit",
    "pay",
    "order",
    "subscribe",
    "sign up",
    "register",
    "book",
    "reserve",
    "confirm",
    "delete",
    "cancel",
  ];

  const actionLower = action.toLowerCase();
  return confirmActions.some((keyword) => actionLower.includes(keyword));
}

/** Morning brief integration — browser agent has no periodic data. */
export async function getMorningBriefSummary(): Promise<null> {
  return null;
}

/**
 * Register browser-agent availability on gateway startup.
 * This hook does NOT create cron jobs — it is on-demand only.
 */
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const stateDir = resolveStateDir(process.env, os.homedir);
    const config = await loadBrowserConfig(stateDir);

    if (!config.enabled) {
      log.info("browser-agent disabled in config — skipping");
      return;
    }

    const available = await isBrowserAgentAvailable(config);
    if (available) {
      log.info(`browser-agent available on port ${config.port}`);
    } else {
      log.warn(
        `browser-agent enabled but not reachable on port ${config.port} — will retry on demand`,
      );
    }

    log.info(
      `browser-agent registered (confirmation: ${config.requireConfirmation ? "required" : "auto"}, budget: ${(config.maxBudgetCents / 100).toFixed(2)} EUR)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to initialize browser-agent: ${message}`);
  }
};

export default handler;

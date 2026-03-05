import type { OpenClawConfig } from "../config/config.js";
import type { SessionEntry } from "../config/sessions/types.js";
import { loadCostUsageSummary, loadSessionCostSummary } from "./session-cost-usage.js";

/**
 * Thrown when an agent turn is blocked because a configured spending cap is exceeded.
 */
export class SpendingLimitExceededError extends Error {
  constructor(
    public readonly kind: "daily" | "session",
    public readonly limitUsd: number,
    public readonly accumulatedUsd: number,
  ) {
    const kindLabel = kind === "daily" ? "Daily" : "Session";
    super(
      `${kindLabel} spending limit of $${limitUsd.toFixed(2)} reached (accumulated: $${accumulatedUsd.toFixed(4)})`,
    );
    this.name = "SpendingLimitExceededError";
  }
}

/**
 * Check configured spending limits and throw `SpendingLimitExceededError`
 * if the accumulated cost for today or the current session exceeds the cap.
 *
 * This should be called before every new agent turn so that over-budget
 * sessions are stopped before incurring additional API charges.
 */
export async function checkSpendingLimits(params: {
  config: OpenClawConfig;
  sessionId?: string;
  sessionEntry?: SessionEntry;
  sessionFile?: string;
  agentId?: string;
}): Promise<void> {
  const spending = params.config.spending;
  if (!spending) {
    return;
  }

  const { maxDailyCostUsd, maxSessionCostUsd } = spending;
  if (!maxDailyCostUsd && !maxSessionCostUsd) {
    return;
  }

  // Check daily limit first (cheapest check — one pass over all session files for today).
  if (maxDailyCostUsd !== undefined && maxDailyCostUsd > 0) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const summary = await loadCostUsageSummary({
      startMs: todayStart.getTime(),
      endMs: Date.now(),
      config: params.config,
      agentId: params.agentId,
    });

    const dailyCost = summary.totals.totalCost;
    if (dailyCost >= maxDailyCostUsd) {
      throw new SpendingLimitExceededError("daily", maxDailyCostUsd, dailyCost);
    }
  }

  // Check session limit (scoped to the single session transcript file).
  if (
    maxSessionCostUsd !== undefined &&
    maxSessionCostUsd > 0 &&
    (params.sessionId || params.sessionFile)
  ) {
    const sessionSummary = await loadSessionCostSummary({
      sessionId: params.sessionId,
      sessionEntry: params.sessionEntry,
      sessionFile: params.sessionFile,
      config: params.config,
      agentId: params.agentId,
    });

    if (sessionSummary) {
      // SessionCostSummary extends CostUsageTotals directly (no nested .totals)
      const sessionCost = sessionSummary.totalCost;
      if (sessionCost >= maxSessionCostUsd) {
        throw new SpendingLimitExceededError("session", maxSessionCostUsd, sessionCost);
      }
    }
  }
}

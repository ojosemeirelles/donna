/**
 * Spending limit configuration for API cost enforcement.
 * When limits are set, agent runs are blocked before they start if the
 * accumulated cost for the day or current session exceeds the threshold.
 */
export type SpendingConfig = {
  /**
   * Maximum API spend (USD) allowed in a single calendar day (UTC).
   * New agent turns are blocked once this threshold is reached.
   * Example: 1.00 blocks runs after $1.00 has been spent today.
   */
  maxDailyCostUsd?: number;
  /**
   * Maximum API spend (USD) allowed in a single session transcript.
   * New agent turns for that session are blocked once the threshold is reached.
   * Example: 0.50 blocks runs after $0.50 has been spent in the session.
   */
  maxSessionCostUsd?: number;
};

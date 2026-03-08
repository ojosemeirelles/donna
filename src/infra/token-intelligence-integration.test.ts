/**
 * Integration tests for Token Intelligence pipeline wiring.
 *
 * Verifies that the three modules (Model Router, Auto-Compact, Prompt Cache)
 * work correctly with DonnaConfig tokenIntelligence settings.
 */

import { describe, expect, it } from "vitest";
import {
  classifyPromptComplexity,
  resolveModelRouterConfig,
  type ModelRouterConfig,
} from "./model-router.js";
import {
  evaluateCompactionNeed,
  resolveAutoCompactConfig,
  type AutoCompactConfig,
} from "./auto-compact.js";
import {
  markBlocksForCaching,
  resolvePromptCacheConfig,
  shouldCacheBlock,
  type PromptCacheConfig,
} from "./prompt-cache.js";

describe("Token Intelligence config integration", () => {
  it("model router respects DonnaConfig shape", () => {
    const donnaConfig = {
      tokenIntelligence: {
        modelRouter: {
          enabled: true,
          thresholds: { haiku: 300, sonnet: 1500 },
        },
      },
    };
    const resolved = resolveModelRouterConfig(
      donnaConfig.tokenIntelligence.modelRouter,
    );
    expect(resolved.enabled).toBe(true);
    expect(resolved.thresholds.haiku).toBe(300);
    expect(resolved.thresholds.sonnet).toBe(1500);
  });

  it("auto-compact respects DonnaConfig shape", () => {
    const donnaConfig = {
      tokenIntelligence: {
        autoCompact: {
          enabled: true,
          threshold: 0.65,
          preserveLastN: 5,
        },
      },
    };
    const resolved = resolveAutoCompactConfig(
      donnaConfig.tokenIntelligence.autoCompact,
    );
    expect(resolved.enabled).toBe(true);
    expect(resolved.threshold).toBe(0.65);
    expect(resolved.preserveLastN).toBe(5);
  });

  it("prompt cache respects DonnaConfig shape", () => {
    const donnaConfig = {
      tokenIntelligence: {
        promptCache: {
          enabled: true,
          heartbeatIntervalMs: 180_000,
        },
      },
    };
    const resolved = resolvePromptCacheConfig(
      donnaConfig.tokenIntelligence.promptCache,
    );
    expect(resolved.enabled).toBe(true);
    expect(resolved.heartbeatIntervalMs).toBe(180_000);
  });

  it("model router classifies cron jobs as haiku", () => {
    const tier = classifyPromptComplexity(
      "Please analyze and architect this complex system",
      { isCronJob: true },
    );
    expect(tier).toBe("haiku");
  });

  it("model router classifies subagents with large context as sonnet", () => {
    const tier = classifyPromptComplexity("ping", {
      isSubagent: true,
      accumulatedContextTokens: 60_000,
    });
    expect(tier).toBe("sonnet");
  });

  it("auto-compact recommends compaction at 70% threshold", () => {
    const result = evaluateCompactionNeed({
      currentTokens: 75_000,
      contextWindowTokens: 100_000,
    });
    expect(result.shouldCompact).toBe(true);
    expect(result.usageRatio).toBe(0.75);
  });

  it("auto-compact skips when disabled", () => {
    const result = evaluateCompactionNeed({
      currentTokens: 90_000,
      contextWindowTokens: 100_000,
      config: { enabled: false },
    });
    expect(result.shouldCompact).toBe(false);
    expect(result.reason).toBe("compaction disabled");
  });

  it("prompt cache marks large blocks for caching", () => {
    const largeText = "x".repeat(5000);
    const blocks = markBlocksForCaching([{ type: "text", text: largeText }]);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("prompt cache skips small blocks", () => {
    const blocks = markBlocksForCaching([{ type: "text", text: "small" }]);
    expect(blocks[0].cache_control).toBeUndefined();
  });

  it("all modules default to enabled when config is undefined", () => {
    const routerCfg = resolveModelRouterConfig(undefined);
    expect(routerCfg.enabled).toBe(true);

    const compactCfg = resolveAutoCompactConfig(undefined);
    expect(compactCfg.enabled).toBe(true);

    const cacheCfg = resolvePromptCacheConfig(undefined);
    expect(cacheCfg.enabled).toBe(true);
  });

  it("all modules can be explicitly disabled", () => {
    const routerCfg = resolveModelRouterConfig({ enabled: false });
    expect(routerCfg.enabled).toBe(false);

    const compactCfg = resolveAutoCompactConfig({ enabled: false });
    expect(compactCfg.enabled).toBe(false);

    const cacheCfg = resolvePromptCacheConfig({ enabled: false });
    expect(cacheCfg.enabled).toBe(false);
  });
});

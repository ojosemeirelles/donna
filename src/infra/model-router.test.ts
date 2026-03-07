import { describe, expect, it } from "vitest";
import {
  classifyPromptComplexity,
  containsComplexityKeyword,
  estimateTokens,
  resolveModelRouterConfig,
} from "./model-router.js";

describe("estimateTokens", () => {
  it("returns 1 for a 4-char string", () => {
    expect(estimateTokens("abcd")).toBe(1);
  });

  it("rounds up for non-multiples of 4", () => {
    expect(estimateTokens("abc")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("scales linearly with length", () => {
    const text = "a".repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});

describe("containsComplexityKeyword", () => {
  it("returns true for 'analyze'", () => {
    expect(containsComplexityKeyword("Please analyze this code")).toBe(true);
  });

  it("returns true for 'architect' (case-insensitive)", () => {
    expect(containsComplexityKeyword("Architect a system")).toBe(true);
  });

  it("returns false for simple greeting", () => {
    expect(containsComplexityKeyword("Hello there")).toBe(false);
  });

  it("returns true for 'multi-step'", () => {
    expect(containsComplexityKeyword("This is a multi-step task")).toBe(true);
  });
});

describe("resolveModelRouterConfig", () => {
  it("applies defaults when no config provided", () => {
    const cfg = resolveModelRouterConfig();
    expect(cfg.enabled).toBe(true);
    expect((cfg.thresholds as { haiku: number }).haiku).toBe(500);
    expect((cfg.thresholds as { sonnet: number }).sonnet).toBe(2000);
  });

  it("respects custom thresholds", () => {
    const cfg = resolveModelRouterConfig({ thresholds: { haiku: 100, sonnet: 1000 } });
    expect((cfg.thresholds as { haiku: number }).haiku).toBe(100);
    expect((cfg.thresholds as { sonnet: number }).sonnet).toBe(1000);
  });

  it("respects enabled: false", () => {
    const cfg = resolveModelRouterConfig({ enabled: false });
    expect(cfg.enabled).toBe(false);
  });
});

describe("classifyPromptComplexity", () => {
  it("returns 'sonnet' when router is disabled", () => {
    expect(classifyPromptComplexity("analyze everything", undefined, { enabled: false })).toBe(
      "sonnet",
    );
  });

  it("returns 'haiku' for cron jobs regardless of prompt", () => {
    expect(
      classifyPromptComplexity("Please analyze and refactor this complex architecture", {
        isCronJob: true,
      }),
    ).toBe("haiku");
  });

  it("returns 'opus' for keyword 'architect'", () => {
    expect(classifyPromptComplexity("architect a new microservice")).toBe("opus");
  });

  it("returns 'opus' for keyword 'implement'", () => {
    expect(classifyPromptComplexity("implement the new feature")).toBe("opus");
  });

  it("returns 'haiku' for haiku keyword with short prompt", () => {
    // "status" keyword + short = haiku
    expect(classifyPromptComplexity("status check")).toBe("haiku");
  });

  it("returns 'haiku' for short prompt without special keywords", () => {
    // Very short prompt, under 500 token threshold
    expect(classifyPromptComplexity("ok")).toBe("haiku");
  });

  it("returns 'sonnet' for medium-length prompt", () => {
    // 500-2000 token range (2000-8000 chars)
    const mediumPrompt = "a".repeat(2500); // ~625 tokens
    expect(classifyPromptComplexity(mediumPrompt)).toBe("sonnet");
  });

  it("returns 'opus' for very long prompt", () => {
    const longPrompt = "a".repeat(9000); // ~2250 tokens, above sonnet threshold
    expect(classifyPromptComplexity(longPrompt)).toBe("opus");
  });

  it("promotes 'haiku' to 'sonnet' when accumulatedContextTokens > 50000", () => {
    const result = classifyPromptComplexity("ping", { accumulatedContextTokens: 51_000 });
    expect(result).toBe("sonnet");
  });

  it("does NOT promote cron job haiku even with large context", () => {
    // Cron jobs return early before promotion check
    const result = classifyPromptComplexity("ping", {
      isCronJob: true,
      accumulatedContextTokens: 100_000,
    });
    expect(result).toBe("haiku");
  });

  it("does NOT promote haiku→sonnet when accumulated context is below 50000", () => {
    const result = classifyPromptComplexity("ping", { accumulatedContextTokens: 10_000 });
    expect(result).toBe("haiku");
  });

  it("respects custom haiku threshold", () => {
    // With haiku threshold = 50 tokens, a 60-token prompt should be sonnet
    const prompt = "a".repeat(250); // ~63 tokens
    expect(
      classifyPromptComplexity(prompt, undefined, { thresholds: { haiku: 50, sonnet: 2000 } }),
    ).toBe("sonnet");
  });
});

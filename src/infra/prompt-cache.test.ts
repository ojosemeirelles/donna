import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CacheHeartbeatKeeper,
  loadCacheStats,
  markBlocksForCaching,
  resolvePromptCacheConfig,
  saveCacheStats,
  shouldAlertLowCacheHitRate,
  shouldCacheBlock,
  updateCacheStats,
} from "./prompt-cache.js";

describe("resolvePromptCacheConfig", () => {
  it("applies defaults when no config provided", () => {
    const cfg = resolvePromptCacheConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.heartbeatIntervalMs).toBe(240_000);
    expect(cfg.statsPath).toBe("/tmp/donna-cache-stats.json");
  });

  it("respects custom values", () => {
    const cfg = resolvePromptCacheConfig({
      heartbeatIntervalMs: 60_000,
      statsPath: "/tmp/test.json",
    });
    expect(cfg.heartbeatIntervalMs).toBe(60_000);
    expect(cfg.statsPath).toBe("/tmp/test.json");
  });
});

describe("shouldCacheBlock", () => {
  it("returns true for a large text block (>= 1024 estimated tokens)", () => {
    const largeText = "a".repeat(4096 + 1); // > 1024 tokens
    expect(shouldCacheBlock({ type: "text", text: largeText })).toBe(true);
  });

  it("returns false for a small text block (< 1024 estimated tokens)", () => {
    expect(shouldCacheBlock({ type: "text", text: "hello" })).toBe(false);
  });

  it("returns false for non-text blocks", () => {
    expect(shouldCacheBlock({ type: "image", text: "a".repeat(5000) })).toBe(false);
  });

  it("returns false for text block with no text property", () => {
    expect(shouldCacheBlock({ type: "text" })).toBe(false);
  });
});

describe("markBlocksForCaching", () => {
  it("adds cache_control to large text blocks", () => {
    const largeText = "a".repeat(5000);
    const result = markBlocksForCaching([{ type: "text", text: largeText }]);
    expect(result[0]?.cache_control).toEqual({ type: "ephemeral" });
  });

  it("does NOT add cache_control to small text blocks", () => {
    const result = markBlocksForCaching([{ type: "text", text: "small" }]);
    expect(result[0]?.cache_control).toBeUndefined();
  });

  it("does NOT add cache_control to non-text blocks", () => {
    const largeText = "a".repeat(5000);
    const result = markBlocksForCaching([{ type: "image", text: largeText }]);
    expect(result[0]?.cache_control).toBeUndefined();
  });

  it("returns type 'text' for all results", () => {
    const blocks = [
      { type: "text", text: "small" },
      { type: "text", text: "a".repeat(5000) },
    ];
    const result = markBlocksForCaching(blocks);
    expect(result.every((b) => b.type === "text")).toBe(true);
  });
});

describe("updateCacheStats", () => {
  const empty = {
    updatedAt: "2026-01-01T00:00:00.000Z",
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheWrites: 0,
    hitRate: 0,
    estimatedSavingsTokens: 0,
  };

  it("increments cacheHits correctly", () => {
    const updated = updateCacheStats(empty, { cache_read_input_tokens: 500 });
    expect(updated.cacheHits).toBe(500);
  });

  it("increments cacheWrites correctly", () => {
    const updated = updateCacheStats(empty, { cache_creation_input_tokens: 200 });
    expect(updated.cacheWrites).toBe(200);
  });

  it("calculates hitRate correctly", () => {
    const stats = { ...empty, cacheHits: 3, cacheMisses: 1 };
    const updated = updateCacheStats(stats, { cache_read_input_tokens: 0, input_tokens: 0 });
    // totalCacheEvents = 3 + 1 = 4, hits = 3
    expect(updated.hitRate).toBe(3 / 4);
  });

  it("accumulates estimatedSavingsTokens", () => {
    const stats = { ...empty, estimatedSavingsTokens: 1000 };
    const updated = updateCacheStats(stats, { cache_read_input_tokens: 500 });
    expect(updated.estimatedSavingsTokens).toBe(1500);
  });

  it("increments totalRequests by 1 per call", () => {
    const updated = updateCacheStats(empty, {});
    expect(updated.totalRequests).toBe(1);
  });
});

describe("shouldAlertLowCacheHitRate", () => {
  it("returns true when hitRate is below 50%", () => {
    const stats = {
      updatedAt: "",
      totalRequests: 10,
      cacheHits: 2,
      cacheMisses: 8,
      cacheWrites: 0,
      hitRate: 0.2,
      estimatedSavingsTokens: 0,
    };
    expect(shouldAlertLowCacheHitRate(stats)).toBe(true);
  });

  it("returns false when hitRate is at or above 50%", () => {
    const stats = {
      updatedAt: "",
      totalRequests: 10,
      cacheHits: 6,
      cacheMisses: 4,
      cacheWrites: 0,
      hitRate: 0.6,
      estimatedSavingsTokens: 0,
    };
    expect(shouldAlertLowCacheHitRate(stats)).toBe(false);
  });

  it("returns false when no requests have been made", () => {
    const stats = {
      updatedAt: "",
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheWrites: 0,
      hitRate: 0,
      estimatedSavingsTokens: 0,
    };
    expect(shouldAlertLowCacheHitRate(stats)).toBe(false);
  });
});

describe("loadCacheStats", () => {
  it("returns empty stats when file does not exist", async () => {
    const stats = await loadCacheStats("/nonexistent/path/stats.json");
    expect(stats.totalRequests).toBe(0);
    expect(stats.cacheHits).toBe(0);
    expect(stats.hitRate).toBe(0);
  });
});

describe("CacheHeartbeatKeeper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isRunning returns false initially", () => {
    const keeper = new CacheHeartbeatKeeper({ heartbeatIntervalMs: 1000 });
    expect(keeper.isRunning()).toBe(false);
  });

  it("isRunning returns true after start", () => {
    const keeper = new CacheHeartbeatKeeper({ heartbeatIntervalMs: 1000 });
    keeper.start(() => {});
    expect(keeper.isRunning()).toBe(true);
    keeper.stop();
  });

  it("isRunning returns false after stop", () => {
    const keeper = new CacheHeartbeatKeeper({ heartbeatIntervalMs: 1000 });
    keeper.start(() => {});
    keeper.stop();
    expect(keeper.isRunning()).toBe(false);
  });

  it("calls onHeartbeat at interval", () => {
    const onHeartbeat = vi.fn();
    const keeper = new CacheHeartbeatKeeper({ heartbeatIntervalMs: 1000 });
    keeper.start(onHeartbeat);

    vi.advanceTimersByTime(3000);
    expect(onHeartbeat).toHaveBeenCalledTimes(3);

    keeper.stop();
  });

  it("does not start twice if already running", () => {
    const onHeartbeat1 = vi.fn();
    const onHeartbeat2 = vi.fn();
    const keeper = new CacheHeartbeatKeeper({ heartbeatIntervalMs: 1000 });

    keeper.start(onHeartbeat1);
    keeper.start(onHeartbeat2); // should be a no-op

    vi.advanceTimersByTime(1000);
    expect(onHeartbeat1).toHaveBeenCalledTimes(1);
    expect(onHeartbeat2).toHaveBeenCalledTimes(0);

    keeper.stop();
  });
});

describe("saveCacheStats", () => {
  it("completes without throwing even for an invalid path", async () => {
    const stats = {
      updatedAt: new Date().toISOString(),
      totalRequests: 1,
      cacheHits: 0,
      cacheMisses: 1,
      cacheWrites: 0,
      hitRate: 0,
      estimatedSavingsTokens: 0,
    };
    // Should not throw, even if path is invalid
    await expect(saveCacheStats("/nonexistent-root/test.json", stats)).resolves.not.toThrow();
  });
});

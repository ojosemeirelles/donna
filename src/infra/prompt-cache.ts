/**
 * Prompt Cache Manager — Anthropic cache_control markers + heartbeat keeper.
 *
 * Marks static system prompt blocks with cache_control so Anthropic's prompt
 * cache can be activated, tracks hit/miss statistics, and exposes a heartbeat
 * keeper that periodically re-sends cache markers to extend the cache TTL.
 */

import fs from "node:fs";
import path from "node:path";

export type CacheControl = { type: "ephemeral" };

export type CachableBlock = {
  type: "text";
  text: string;
  cache_control?: CacheControl;
};

export type CacheStats = {
  updatedAt: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheWrites: number;
  hitRate: number;
  estimatedSavingsTokens: number;
};

export type PromptCacheConfig = {
  enabled?: boolean;
  heartbeatIntervalMs?: number;
  statsPath?: string;
};

const DEFAULT_HEARTBEAT_INTERVAL_MS = 240_000; // 4 minutes
const DEFAULT_STATS_PATH = "/tmp/donna-cache-stats.json";

/** Minimum estimated tokens for a block to qualify for caching (Anthropic minimum). */
const MIN_CACHE_TOKENS = 1024;

/** Resolves config with defaults applied. */
export function resolvePromptCacheConfig(raw?: PromptCacheConfig): Required<PromptCacheConfig> {
  return {
    enabled: raw?.enabled ?? true,
    heartbeatIntervalMs: raw?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    statsPath: raw?.statsPath ?? DEFAULT_STATS_PATH,
  };
}

/**
 * Returns true if a content block is eligible for caching.
 * Only `text` blocks with >= 1024 estimated tokens are marked.
 */
export function shouldCacheBlock(block: { type: string; text?: string }): boolean {
  if (block.type !== "text") {
    return false;
  }
  const text = block.text ?? "";
  const estimatedTokens = Math.ceil(text.length / 4);
  return estimatedTokens >= MIN_CACHE_TOKENS;
}

/**
 * Marks eligible static blocks with `cache_control: { type: "ephemeral" }`.
 * Blocks that are too small or not text-type are returned unchanged (without cache_control).
 */
export function markBlocksForCaching(
  blocks: Array<{ type: string; text?: string }>,
): CachableBlock[] {
  return blocks.map((block): CachableBlock => {
    const text = block.text ?? "";
    if (shouldCacheBlock(block)) {
      return { type: "text", text, cache_control: { type: "ephemeral" } };
    }
    return { type: "text", text };
  });
}

/** Returns an empty CacheStats record. */
function emptyStats(): CacheStats {
  return {
    updatedAt: new Date().toISOString(),
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheWrites: 0,
    hitRate: 0,
    estimatedSavingsTokens: 0,
  };
}

/**
 * Updates cache stats from an API usage response.
 * `cache_read_input_tokens` → hits; `cache_creation_input_tokens` → writes;
 * remaining `input_tokens` → misses (fresh prompt tokens).
 */
export function updateCacheStats(
  current: CacheStats,
  usage: {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
    input_tokens?: number;
  },
): CacheStats {
  const hits = usage.cache_read_input_tokens ?? 0;
  const writes = usage.cache_creation_input_tokens ?? 0;
  const misses = usage.input_tokens ?? 0;

  const newHits = current.cacheHits + hits;
  const newMisses = current.cacheMisses + misses;
  const newWrites = current.cacheWrites + writes;
  const total = current.totalRequests + 1;
  const totalCacheEvents = newHits + newMisses;

  return {
    updatedAt: new Date().toISOString(),
    totalRequests: total,
    cacheHits: newHits,
    cacheMisses: newMisses,
    cacheWrites: newWrites,
    hitRate: totalCacheEvents > 0 ? newHits / totalCacheEvents : 0,
    estimatedSavingsTokens: current.estimatedSavingsTokens + hits,
  };
}

/**
 * Loads cache stats from a JSON file. Returns empty stats if the file does not exist
 * or cannot be parsed (graceful degradation).
 */
export async function loadCacheStats(statsPath: string): Promise<CacheStats> {
  try {
    const raw = await fs.promises.readFile(statsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CacheStats>;
    return {
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      totalRequests: parsed.totalRequests ?? 0,
      cacheHits: parsed.cacheHits ?? 0,
      cacheMisses: parsed.cacheMisses ?? 0,
      cacheWrites: parsed.cacheWrites ?? 0,
      hitRate: parsed.hitRate ?? 0,
      estimatedSavingsTokens: parsed.estimatedSavingsTokens ?? 0,
    };
  } catch {
    return emptyStats();
  }
}

/**
 * Persists cache stats to a JSON file. Fails gracefully (logs nothing, swallows errors)
 * to avoid disrupting the main request pipeline.
 */
export async function saveCacheStats(statsPath: string, stats: CacheStats): Promise<void> {
  try {
    await fs.promises.mkdir(path.dirname(statsPath), { recursive: true });
    await fs.promises.writeFile(statsPath, JSON.stringify(stats, null, 2), "utf-8");
  } catch {
    // Best-effort; never throw from a stats save.
  }
}

/**
 * Returns true if the cache hit rate is below the alert threshold (default 50%).
 * Used to surface cache inefficiency warnings.
 */
export function shouldAlertLowCacheHitRate(stats: CacheStats, threshold = 0.5): boolean {
  if (stats.totalRequests === 0) {
    return false;
  }
  return stats.hitRate < threshold;
}

/**
 * Heartbeat keeper that periodically invokes a callback to re-send cache markers,
 * extending the Anthropic prompt cache TTL (which expires after ~5 minutes of inactivity).
 */
export class CacheHeartbeatKeeper {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private readonly _intervalMs: number;

  constructor(config?: PromptCacheConfig) {
    const cfg = resolvePromptCacheConfig(config);
    this._intervalMs = cfg.heartbeatIntervalMs;
  }

  /** Starts the heartbeat. Calls `onHeartbeat` at the configured interval. */
  start(onHeartbeat: () => void): void {
    if (this._timer !== null) {
      return;
    } // already running
    this._timer = setInterval(onHeartbeat, this._intervalMs);
    // Prevent the timer from keeping the process alive in test environments.
    if (this._timer.unref) {
      this._timer.unref();
    }
  }

  /** Stops the heartbeat. */
  stop(): void {
    if (this._timer === null) {
      return;
    }
    clearInterval(this._timer);
    this._timer = null;
  }

  /** Returns true if the heartbeat is currently running. */
  isRunning(): boolean {
    return this._timer !== null;
  }
}

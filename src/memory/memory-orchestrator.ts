/**
 * Memory Orchestrator — coordinates the 3-layer Donna memory system.
 *
 * Acts as the single integration point for:
 *   1. Identity layer  — who the user is (identity-memory)
 *   2. Pattern layer   — how the user interacts (pattern-memory)
 *   3. Episodic layer  — what the user did recently (episodic-memory)
 *
 * On session start, it assembles a context block that is injected into the
 * agent's MEMORY.md bootstrap file. Pattern events are recorded through this
 * orchestrator so callers don't need to manage the memory directory.
 *
 * All methods fail gracefully — a memory error must never break a session.
 */

import os from "node:os";
import path from "node:path";
import {
  buildEpisodicContextBlock,
  episodeDateString,
  loadEpisodeSummary,
  resolveEpisodicConfig,
  type EpisodicMemoryConfig,
  type EpisodeSummary,
} from "./episodic-memory.js";
import {
  buildIdentityContextBlock,
  loadIdentity,
  resolveIdentityConfig,
  type IdentityMemoryConfig,
  type UserIdentity,
} from "./identity-memory.js";
import {
  buildPatternContextBlock,
  loadPatternStore,
  recordEvent,
  resolvePatternConfig,
  type PatternEvent,
  type PatternMemoryConfig,
  type PatternSummary,
} from "./pattern-memory.js";

export type MemorySystemConfig = {
  /** Master switch. Default: false (opt-in). */
  enabled?: boolean;
  identity?: IdentityMemoryConfig;
  patterns?: PatternMemoryConfig;
  episodic?: EpisodicMemoryConfig;
};

export type MemoryContext = {
  identity: UserIdentity;
  patternSummary: PatternSummary | undefined;
  todaySummary: EpisodeSummary | null;
  yesterdaySummary: EpisodeSummary | null;
};

const DEFAULT_MEMORY_SUBDIR = "memory";

/** Returns the default memory directory (~/.donna/memory). */
export function resolveMemoryDir(stateDir?: string): string {
  const base = stateDir ?? path.join(os.homedir(), ".donna");
  return path.join(base, DEFAULT_MEMORY_SUBDIR);
}

/**
 * Assembles the full Markdown context block from all memory layers.
 * Sections are separated by blank lines; empty sections are omitted.
 */
export function buildMemoryContextBlock(context: MemoryContext): string {
  const sections: string[] = [];

  const identityBlock = buildIdentityContextBlock(context.identity);
  if (identityBlock) {
    sections.push(identityBlock);
  }

  if (context.patternSummary) {
    const patternBlock = buildPatternContextBlock(context.patternSummary);
    if (patternBlock) {
      sections.push(patternBlock);
    }
  }

  const episodicBlock = buildEpisodicContextBlock(context.todaySummary, context.yesterdaySummary);
  if (episodicBlock) {
    sections.push(episodicBlock);
  }

  if (sections.length === 0) {
    return "";
  }

  return ["# Donna Memory", "", ...sections.flatMap((s) => [s, ""])].join("\n").trimEnd();
}

/**
 * MemoryOrchestrator — stateful coordinator for the 3-layer memory system.
 *
 * Intended usage:
 *   const orchestrator = new MemoryOrchestrator(config, stateDir);
 *   // on agent bootstrap:
 *   const contextBlock = await orchestrator.onSessionStart(sessionId);
 *   // inject contextBlock as MEMORY.md bootstrap file content
 */
export class MemoryOrchestrator {
  private readonly config: Required<MemorySystemConfig> & {
    identity: Required<IdentityMemoryConfig>;
    patterns: Required<PatternMemoryConfig>;
    episodic: Required<EpisodicMemoryConfig>;
  };
  private readonly memoryDir: string;

  constructor(config?: MemorySystemConfig, stateDir?: string) {
    this.config = {
      enabled: config?.enabled ?? false,
      identity: resolveIdentityConfig(config?.identity),
      patterns: resolvePatternConfig(config?.patterns),
      episodic: resolveEpisodicConfig(config?.episodic),
    };
    this.memoryDir = resolveMemoryDir(stateDir);
  }

  /** Returns true if the memory system is enabled. */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Returns the resolved memory directory path. */
  getMemoryDir(): string {
    return this.memoryDir;
  }

  /**
   * Called on every agent bootstrap. Loads all three memory layers and
   * returns a Markdown context block to inject into the MEMORY.md bootstrap
   * file. Returns an empty string when the system is disabled.
   */
  async onSessionStart(sessionId: string): Promise<string> {
    if (!this.isEnabled()) {
      return "";
    }

    try {
      const context = await this.loadContext();
      const block = buildMemoryContextBlock(context);

      // Record the session start as a pattern event
      if (this.config.patterns.enabled) {
        await recordEvent(this.memoryDir, {
          type: "session_start",
          value: sessionId,
          timestamp: new Date().toISOString(),
        });
      }

      return block;
    } catch {
      return "";
    }
  }

  /**
   * Records a pattern event. Used by telemetry integration points (e.g.,
   * tool calls in session-cost-usage). Fails gracefully.
   */
  async recordEvent(event: PatternEvent): Promise<void> {
    if (!this.isEnabled() || !this.config.patterns.enabled) {
      return;
    }
    await recordEvent(this.memoryDir, event, this.config.patterns);
  }

  /**
   * Loads and returns the full memory context from all three layers.
   * Individual layer failures return safe defaults (empty objects/null).
   */
  async loadContext(): Promise<MemoryContext> {
    const today = episodeDateString();
    const yesterday = episodeDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const [identity, patternStore, todaySummary, yesterdaySummary] = await Promise.all([
      this.config.identity.enabled
        ? loadIdentity(this.memoryDir).catch(() => ({}) as UserIdentity)
        : Promise.resolve({} as UserIdentity),
      this.config.patterns.enabled
        ? loadPatternStore(this.memoryDir).catch(() => ({ events: [] }))
        : Promise.resolve({ events: [] }),
      this.config.episodic.enabled
        ? loadEpisodeSummary(this.memoryDir, today).catch(() => null)
        : Promise.resolve(null),
      this.config.episodic.enabled
        ? loadEpisodeSummary(this.memoryDir, yesterday).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      identity,
      patternSummary: patternStore.summary,
      todaySummary,
      yesterdaySummary,
    };
  }

  /**
   * Runs a consolidation pass: prunes old episodes and records a
   * consolidation event in the pattern store. Called by the weekly cron job.
   */
  async consolidate(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const { pruneEpisodes } = await import("./episodic-memory.js");
      await pruneEpisodes(
        this.memoryDir,
        this.config.episodic.retentionDays,
        this.config.episodic.summaryRetentionDays,
      );
    } catch {
      // Non-fatal
    }

    await recordEvent(this.memoryDir, {
      type: "consolidation",
      timestamp: new Date().toISOString(),
    });
  }
}

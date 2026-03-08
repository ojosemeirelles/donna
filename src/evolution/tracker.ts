/**
 * EvolutionTracker — tracks usage stats for level progression.
 *
 * Persists state to ~/.donna/evolution.json.
 * All methods are safe to call — errors are logged but never thrown.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { EvolutionLevel } from "./level.js";

export type EvolutionStats = {
  totalInteractions: number;
  daysActive: number;
  skillsUsed: string[];
  firstSeenAt: string; // ISO date
  lastSeenAt: string; // ISO date
  activeDays: string[]; // ISO date strings (unique)
};

export type EvolutionState = {
  level: EvolutionLevel;
  stats: EvolutionStats;
  levelUpHistory: Array<{
    from: EvolutionLevel;
    to: EvolutionLevel;
    at: string; // ISO date
  }>;
};

const DEFAULT_STATE_PATH = join(homedir(), ".donna", "evolution.json");

/** Global singleton instance — avoids race conditions from multiple trackers. */
let globalInstance: EvolutionTracker | null = null;

function createInitialState(): EvolutionState {
  const now = new Date().toISOString();
  return {
    level: 1,
    stats: {
      totalInteractions: 0,
      daysActive: 0,
      skillsUsed: [],
      firstSeenAt: now,
      lastSeenAt: now,
      activeDays: [],
    },
    levelUpHistory: [],
  };
}

export class EvolutionTracker {
  private state: EvolutionState;
  private readonly statePath: string;
  private dirty = false;

  constructor(statePath?: string) {
    this.statePath = statePath ?? DEFAULT_STATE_PATH;
    this.state = createInitialState();
  }

  /** Returns the global singleton tracker instance (lazy-initialized). */
  static getGlobal(): EvolutionTracker {
    if (!globalInstance) {
      globalInstance = new EvolutionTracker();
    }
    return globalInstance;
  }

  /** Reset global singleton (for testing). */
  static resetGlobal(): void {
    globalInstance = null;
  }

  /** Load persisted state from disk. Returns false if no state found. */
  async load(): Promise<boolean> {
    try {
      const raw = await readFile(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as EvolutionState;
      if (parsed && typeof parsed.level === "number" && parsed.stats) {
        this.state = parsed;
        return true;
      }
    } catch {
      // No persisted state or invalid — start fresh
    }
    return false;
  }

  /** Persist current state to disk. */
  async save(): Promise<void> {
    if (!this.dirty) return;
    try {
      await mkdir(dirname(this.statePath), { recursive: true });
      await writeFile(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
      this.dirty = false;
    } catch {
      // Persistence failure is non-fatal
    }
  }

  /** Record a user interaction. */
  recordInteraction(): void {
    this.state.stats.totalInteractions++;
    const today = new Date().toISOString().slice(0, 10);
    if (!this.state.stats.activeDays.includes(today)) {
      this.state.stats.activeDays.push(today);
      this.state.stats.daysActive = this.state.stats.activeDays.length;
    }
    this.state.stats.lastSeenAt = new Date().toISOString();
    this.dirty = true;
  }

  /** Record a skill being used. */
  recordSkillUsed(skillName: string): void {
    if (!this.state.stats.skillsUsed.includes(skillName)) {
      this.state.stats.skillsUsed.push(skillName);
      this.dirty = true;
    }
  }

  /** Get current state (readonly snapshot). */
  getState(): Readonly<EvolutionState> {
    return this.state;
  }

  /** Get current level. */
  getLevel(): EvolutionLevel {
    return this.state.level;
  }

  /** Set level (used by progression engine). */
  setLevel(newLevel: EvolutionLevel, fromLevel: EvolutionLevel): void {
    this.state.level = newLevel;
    this.state.levelUpHistory.push({
      from: fromLevel,
      to: newLevel,
      at: new Date().toISOString(),
    });
    this.dirty = true;
  }
}

/**
 * EvolutionTracker — XP-based progression tracker.
 * Persists to ~/.donna/evolution.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { EvolutionLevel } from "./level.js";

export type EvolutionStats = {
  totalInteractions: number;
  daysActive: number;
  skillsUsed: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  activeDays: string[];
  // XP-related stats
  xp: number;
  tasksCompleted: number;
  errorsResolved: number;
  uptimeHours: number;
  streakDays: number;
  longestStreak: number;
};

export type EvolutionState = {
  level: EvolutionLevel;
  stats: EvolutionStats;
  levelUpHistory: Array<{
    from: EvolutionLevel;
    to: EvolutionLevel;
    at: string;
  }>;
};

// XP rewards per action
export const XP_REWARDS = {
  message: 2,
  taskCompleted: 10,
  errorResolved: 15,
  skillUsed: 5,
  dailyLogin: 3,
  streakBonus: (days: number) => Math.min(days, 30), // 1 XP per streak day, max 30
} as const;

const DEFAULT_STATE_PATH = join(homedir(), ".donna", "evolution.json");

let globalInstance: EvolutionTracker | null = null;

function createInitialState(): EvolutionState {
  const now = new Date().toISOString();
  return {
    level: 1 as EvolutionLevel,
    stats: {
      totalInteractions: 0,
      daysActive: 0,
      skillsUsed: [],
      firstSeenAt: now,
      lastSeenAt: now,
      activeDays: [],
      xp: 0,
      tasksCompleted: 0,
      errorsResolved: 0,
      uptimeHours: 0,
      streakDays: 0,
      longestStreak: 0,
    },
    levelUpHistory: [],
  };
}

export class EvolutionTracker {
  private state: EvolutionState;
  private readonly statePath: string;
  private dirty = false;
  private interactionsSinceSave = 0;

  constructor(statePath?: string) {
    this.statePath = statePath ?? DEFAULT_STATE_PATH;
    this.state = createInitialState();
  }

  static getGlobal(): EvolutionTracker {
    if (!globalInstance) {
      globalInstance = new EvolutionTracker();
    }
    return globalInstance;
  }

  static resetGlobal(): void {
    globalInstance = null;
  }

  async load(): Promise<boolean> {
    try {
      const raw = await readFile(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as EvolutionState;
      if (parsed && typeof parsed.level === "number" && parsed.stats) {
        // Migrate old format: add missing XP fields
        this.state = {
          ...parsed,
          stats: {
            ...parsed.stats,
            xp: parsed.stats.xp ?? 0,
            tasksCompleted: parsed.stats.tasksCompleted ?? 0,
            errorsResolved: parsed.stats.errorsResolved ?? 0,
            uptimeHours: parsed.stats.uptimeHours ?? 0,
            streakDays: parsed.stats.streakDays ?? 0,
            longestStreak: parsed.stats.longestStreak ?? 0,
          },
        };
        return true;
      }
    } catch {
      // No state or invalid
    }
    return false;
  }

  async save(): Promise<void> {
    if (!this.dirty) {
      return;
    }
    try {
      await mkdir(dirname(this.statePath), { recursive: true });
      await writeFile(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
      this.dirty = false;
      this.interactionsSinceSave = 0;
    } catch {
      // Non-fatal
    }
  }

  /** Should we persist now? (every 10 interactions) */
  shouldAutoSave(): boolean {
    return this.interactionsSinceSave >= 10;
  }

  /** Add XP and return amount added. */
  addXp(amount: number): number {
    this.state.stats.xp += amount;
    this.dirty = true;
    return amount;
  }

  /** Record a user interaction — awards XP. */
  recordInteraction(): number {
    this.state.stats.totalInteractions++;
    const today = new Date().toISOString().slice(0, 10);

    // Daily login + streak tracking
    if (!this.state.stats.activeDays.includes(today)) {
      this.state.stats.activeDays.push(today);
      this.state.stats.daysActive = this.state.stats.activeDays.length;

      // Calculate streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (this.state.stats.activeDays.includes(yesterday)) {
        this.state.stats.streakDays++;
      } else {
        this.state.stats.streakDays = 1;
      }
      if (this.state.stats.streakDays > this.state.stats.longestStreak) {
        this.state.stats.longestStreak = this.state.stats.streakDays;
      }

      // Daily login XP + streak bonus
      this.addXp(XP_REWARDS.dailyLogin + XP_REWARDS.streakBonus(this.state.stats.streakDays));
    }

    this.state.stats.lastSeenAt = new Date().toISOString();
    this.interactionsSinceSave++;
    const xpGained = XP_REWARDS.message;
    this.addXp(xpGained);
    return xpGained;
  }

  /** Record a task completion — awards XP. */
  recordTaskCompleted(): number {
    this.state.stats.tasksCompleted++;
    const xp = XP_REWARDS.taskCompleted;
    this.addXp(xp);
    return xp;
  }

  /** Record an error resolved — awards XP. */
  recordErrorResolved(): number {
    this.state.stats.errorsResolved++;
    const xp = XP_REWARDS.errorResolved;
    this.addXp(xp);
    return xp;
  }

  recordSkillUsed(skillName: string): number {
    if (!this.state.stats.skillsUsed.includes(skillName)) {
      this.state.stats.skillsUsed.push(skillName);
      this.dirty = true;
      return this.addXp(XP_REWARDS.skillUsed);
    }
    return 0;
  }

  /** Update uptime hours. */
  recordUptime(hours: number): void {
    this.state.stats.uptimeHours += hours;
    this.dirty = true;
  }

  getState(): Readonly<EvolutionState> {
    return this.state;
  }

  getLevel(): EvolutionLevel {
    return this.state.level;
  }

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

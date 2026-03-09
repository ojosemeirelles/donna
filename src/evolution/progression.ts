/**
 * Progression Engine — XP-based level up evaluation.
 */

import type { EvolutionLevel } from "./level.js";
import { getMaxLevel, getLevelForXp, getLevelDefinition } from "./level.js";
import type { EvolutionStats } from "./tracker.js";

export type ProgressionResult = {
  shouldLevelUp: boolean;
  currentLevel: EvolutionLevel;
  nextLevel: EvolutionLevel;
  reason?: string;
  unmetCriteria?: string[];
};

/** Evaluate if a level up should occur based on XP. */
export function evaluateProgression(
  currentLevel: EvolutionLevel,
  stats: EvolutionStats,
): ProgressionResult {
  if (currentLevel >= getMaxLevel()) {
    return {
      shouldLevelUp: false,
      currentLevel,
      nextLevel: currentLevel,
      reason: "already at max rank (SSS)",
    };
  }

  const xpLevel = getLevelForXp(stats.xp);
  if (xpLevel > currentLevel) {
    // Level up one rank at a time
    const nextLevel = (currentLevel + 1) as EvolutionLevel;
    const nextDef = getLevelDefinition(nextLevel);
    return {
      shouldLevelUp: true,
      currentLevel,
      nextLevel,
      reason: `XP ${stats.xp} meets requirement ${nextDef.xpRequired} for Rank ${nextDef.rank}: ${nextDef.title}`,
    };
  }

  const nextLevel = (currentLevel + 1) as EvolutionLevel;
  const nextDef = getLevelDefinition(nextLevel);
  return {
    shouldLevelUp: false,
    currentLevel,
    nextLevel,
    unmetCriteria: [`xp: ${stats.xp}/${nextDef.xpRequired}`],
  };
}

/** Check if stats meet criteria (kept for backward compat). */
export function meetsCriteria(
  stats: EvolutionStats,
  criteria: { minDaysActive: number; minInteractions: number; minSkillsUsed?: number },
): { met: boolean; unmet: string[] } {
  const unmet: string[] = [];
  if (stats.daysActive < criteria.minDaysActive) {
    unmet.push(`daysActive: ${stats.daysActive}/${criteria.minDaysActive}`);
  }
  if (stats.totalInteractions < criteria.minInteractions) {
    unmet.push(`interactions: ${stats.totalInteractions}/${criteria.minInteractions}`);
  }
  if (criteria.minSkillsUsed && stats.skillsUsed.length < criteria.minSkillsUsed) {
    unmet.push(`skillsUsed: ${stats.skillsUsed.length}/${criteria.minSkillsUsed}`);
  }
  return { met: unmet.length === 0, unmet };
}

/** Format a level-up message for Telegram notification. */
export function formatLevelUpMessage(fromLevel: EvolutionLevel, toLevel: EvolutionLevel): string {
  const fromDef = getLevelDefinition(fromLevel);
  const toDef = getLevelDefinition(toLevel);
  const unlocks = toDef.unlocks.map((u) => `  - ${u}`).join("\n");

  return [
    `LEVEL UP!`,
    ``,
    `Rank ${fromDef.rank} -> *Rank ${toDef.rank}*`,
    `*${toDef.title}*`,
    ``,
    `_${toDef.description}_`,
    ``,
    `*Skills desbloqueadas:*`,
    unlocks,
    ``,
    `---`,
    `XP necessario para proximo rank: ${toLevel < 8 ? getLevelDefinition((toLevel + 1) as EvolutionLevel).xpRequired : "MAX"}`,
  ].join("\n");
}

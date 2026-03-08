/**
 * Progression Engine — evaluates if a Donna instance should level up.
 *
 * Pure logic: takes stats + current level, returns next level (or same).
 */

import type { EvolutionLevel, LevelCriteria } from "./level.js";
import { LEVEL_DEFINITIONS, getMaxLevel } from "./level.js";
import type { EvolutionStats } from "./tracker.js";

export type ProgressionResult = {
  shouldLevelUp: boolean;
  currentLevel: EvolutionLevel;
  nextLevel: EvolutionLevel;
  reason?: string;
  unmetCriteria?: string[];
};

/** Check if stats meet the criteria for a given level. */
export function meetsCriteria(
  stats: EvolutionStats,
  criteria: LevelCriteria,
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

/** Evaluate if a level up should occur. */
export function evaluateProgression(
  currentLevel: EvolutionLevel,
  stats: EvolutionStats,
): ProgressionResult {
  if (currentLevel >= getMaxLevel()) {
    return {
      shouldLevelUp: false,
      currentLevel,
      nextLevel: currentLevel,
      reason: "already at max level",
    };
  }

  const nextLevel = (currentLevel + 1) as EvolutionLevel;
  const nextDef = LEVEL_DEFINITIONS.find((d) => d.level === nextLevel);
  if (!nextDef) {
    return {
      shouldLevelUp: false,
      currentLevel,
      nextLevel: currentLevel,
      reason: "next level definition not found",
    };
  }

  const { met, unmet } = meetsCriteria(stats, nextDef.criteria);

  if (met) {
    return {
      shouldLevelUp: true,
      currentLevel,
      nextLevel,
      reason: `all criteria met for ${nextDef.name} (Level ${nextLevel})`,
    };
  }

  return {
    shouldLevelUp: false,
    currentLevel,
    nextLevel,
    unmetCriteria: unmet,
  };
}

/** Format a level-up message for notification. */
export function formatLevelUpMessage(
  fromLevel: EvolutionLevel,
  toLevel: EvolutionLevel,
): string {
  const def = LEVEL_DEFINITIONS.find((d) => d.level === toLevel);
  if (!def) return `Level up! ${fromLevel} → ${toLevel}`;

  const unlocks = def.unlocks.join(", ");
  return [
    `Level Up! ${def.name} (Nível ${toLevel})`,
    `${def.description}`,
    `Desbloqueado: ${unlocks}`,
  ].join("\n");
}

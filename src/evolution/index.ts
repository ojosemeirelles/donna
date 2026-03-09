export {
  type EvolutionLevel,
  type Rank,
  type LevelDefinition,
  type LevelCriteria,
  LEVEL_DEFINITIONS,
  getLevelDefinition,
  getMaxLevel,
  getRankForLevel,
  getLevelForXp,
} from "./level.js";

export {
  type EvolutionStats,
  type EvolutionState,
  EvolutionTracker,
  XP_REWARDS,
} from "./tracker.js";

export {
  type ProgressionResult,
  meetsCriteria,
  evaluateProgression,
  formatLevelUpMessage,
} from "./progression.js";

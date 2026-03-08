export {
  type EvolutionLevel,
  type LevelDefinition,
  type LevelCriteria,
  LEVEL_DEFINITIONS,
  getLevelDefinition,
  getMaxLevel,
} from "./level.js";

export {
  type EvolutionStats,
  type EvolutionState,
  EvolutionTracker,
} from "./tracker.js";

export {
  type ProgressionResult,
  meetsCriteria,
  evaluateProgression,
  formatLevelUpMessage,
} from "./progression.js";

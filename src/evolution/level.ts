/**
 * Evolution Level definitions — 5-tier progression system.
 *
 * Each Donna instance evolves individually based on real usage,
 * unlocking capabilities as the user interacts.
 */

export type EvolutionLevel = 1 | 2 | 3 | 4 | 5;

export type LevelDefinition = {
  level: EvolutionLevel;
  name: string;
  description: string;
  criteria: LevelCriteria;
  unlocks: string[];
};

export type LevelCriteria = {
  minDaysActive: number;
  minInteractions: number;
  minSkillsUsed?: number;
  requiresAdvancedConfig?: boolean;
  requiresBusinessPlan?: boolean;
};

export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  {
    level: 1,
    name: "Iniciante",
    description: "Primeiros passos com a Donna",
    criteria: { minDaysActive: 0, minInteractions: 0 },
    unlocks: ["Respostas", "Morning Brief", "Tarefas simples"],
  },
  {
    level: 2,
    name: "Aprendiz",
    description: "Donna começa a te conhecer",
    criteria: { minDaysActive: 7, minInteractions: 20 },
    unlocks: ["Lembra nome", "Preferências", "Estilo de comunicação"],
  },
  {
    level: 3,
    name: "Assistente",
    description: "Donna antecipa suas necessidades",
    criteria: { minDaysActive: 30, minInteractions: 100 },
    unlocks: ["Padrões de uso", "Sugestões proativas", "Antecipação"],
  },
  {
    level: 4,
    name: "Estrategista",
    description: "Donna toma iniciativa",
    criteria: { minDaysActive: 90, minInteractions: 300, minSkillsUsed: 5 },
    unlocks: ["Ciclos autônomos", "Projetos", "Iniciativa própria"],
  },
  {
    level: 5,
    name: "Autônoma",
    description: "Donna opera de forma independente",
    criteria: {
      minDaysActive: 180,
      minInteractions: 1000,
      minSkillsUsed: 10,
      requiresAdvancedConfig: true,
    },
    unlocks: ["Opera 24/7", "Reporta", "Escala decisões"],
  },
] as const;

/** Returns the level definition for a given level number. */
export function getLevelDefinition(level: EvolutionLevel): LevelDefinition {
  const def = LEVEL_DEFINITIONS.find((d) => d.level === level);
  if (!def) throw new Error(`Unknown evolution level: ${level}`);
  return def;
}

/** Returns the maximum evolution level. */
export function getMaxLevel(): EvolutionLevel {
  return 5;
}

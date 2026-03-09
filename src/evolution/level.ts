/**
 * Evolution Level definitions — Solo Leveling 8-rank progression.
 */

export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS";
export type EvolutionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LevelDefinition = {
  level: EvolutionLevel;
  rank: Rank;
  title: string;
  description: string;
  xpRequired: number;
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
    rank: "E",
    title: "Assistente Iniciante",
    description: "Despertou como hunter. Primeiros passos no sistema.",
    xpRequired: 0,
    unlocks: ["Morning Brief", "Respostas basicas"],
  },
  {
    level: 2,
    rank: "D",
    title: "Secretaria Funcional",
    description: "Reconhecida pelo sistema. Memoria ativada.",
    xpRequired: 100,
    unlocks: ["Memory Consolidation", "Lembra seu nome", "Preferencias"],
  },
  {
    level: 3,
    rank: "C",
    title: "Agente Confiavel",
    description: "Padroes detectados. Antecipa necessidades.",
    xpRequired: 500,
    unlocks: ["Multi-task (parallel hooks)", "Sugestoes proativas", "Padroes de uso"],
  },
  {
    level: 4,
    rank: "B",
    title: "Operadora Avancada",
    description: "Toma iniciativa. Ciclos autonomos ativados.",
    xpRequired: 1500,
    unlocks: ["Predictive suggestions", "Ciclos autonomos", "Projetos"],
  },
  {
    level: 5,
    rank: "A",
    title: "IA de Elite",
    description: "Opera com autonomia total. Agenda propria.",
    xpRequired: 5000,
    unlocks: ["Autonomous scheduling", "Opera 24/7", "Relatorios executivos"],
  },
  {
    level: 6,
    rank: "S",
    title: "Sombra do Sistema",
    description: "Transcende a assistencia. Age antes de ser chamada.",
    xpRequired: 15000,
    unlocks: ["Acao preventiva", "Gestao de crises", "Multi-canal autonomo"],
  },
  {
    level: 7,
    rank: "SS",
    title: "Monarca da Produtividade",
    description: "Comanda o sistema. Orquestra todas as operacoes.",
    xpRequired: 50000,
    unlocks: ["Orquestracao total", "Decisoes estrategicas", "Escala automatica"],
  },
  {
    level: 8,
    rank: "SSS",
    title: "Donna Suprema",
    description: "Nivel maximo. A sombra se tornou a luz.",
    xpRequired: 150000,
    unlocks: ["Poder supremo", "Sistema completo", "Lendaria"],
  },
];

export function getLevelDefinition(level: EvolutionLevel): LevelDefinition {
  const def = LEVEL_DEFINITIONS.find((d) => d.level === level);
  if (!def) {
    throw new Error(`Unknown evolution level: ${level}`);
  }
  return def;
}

export function getMaxLevel(): EvolutionLevel {
  return 8;
}

export function getRankForLevel(level: EvolutionLevel): Rank {
  return getLevelDefinition(level).rank;
}

/** Find which level corresponds to a given XP amount. */
export function getLevelForXp(xp: number): EvolutionLevel {
  let result: EvolutionLevel = 1;
  for (const def of LEVEL_DEFINITIONS) {
    if (xp >= def.xpRequired) {
      result = def.level;
    }
  }
  return result;
}

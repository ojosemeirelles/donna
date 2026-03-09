/**
 * Initiative suggestions by Solo Leveling rank.
 */

import type { EvolutionLevel } from "./level.js";
import type { EvolutionStats } from "./tracker.js";

export type Initiative = {
  text: string;
  priority: "high" | "medium" | "low";
};

const INITIATIVES_BY_LEVEL: Record<number, Initiative[]> = {
  1: [
    { text: "Configure seu canal Telegram para conversar com a Donna", priority: "high" },
    { text: "Envie 50 mensagens para ganhar XP e subir de rank", priority: "medium" },
  ],
  2: [
    { text: "Diga seu nome -- Donna vai lembrar (Memory ativada!)", priority: "high" },
    { text: "Configure o Morning Brief para resumos diarios", priority: "medium" },
  ],
  3: [
    {
      text: "Explore skills como web search e code generation para ganhar XP bonus",
      priority: "high",
    },
    { text: "Use Donna diariamente para manter o streak e ganhar XP extra", priority: "medium" },
  ],
  4: [
    { text: "Ative ciclos autonomos -- Donna ja sabe quando agir", priority: "high" },
    { text: "Configure projetos de longo prazo para XP continuo", priority: "medium" },
  ],
  5: [
    { text: "Configure operacao 24/7 -- agenda autonoma desbloqueada", priority: "high" },
    { text: "Relatorios executivos automaticos disponiveis", priority: "medium" },
  ],
  6: [
    { text: "Rank S desbloqueado! Donna age preventivamente agora", priority: "high" },
    { text: "Configure gestao de crises multi-canal", priority: "medium" },
  ],
  7: [
    { text: "Rank SS -- Monarca! Orquestracao total disponivel", priority: "high" },
    { text: "Decisoes estrategicas automatizadas ativadas", priority: "medium" },
  ],
  8: [{ text: "Rank SSS -- Nivel maximo. Donna Suprema. Todo o poder e seu.", priority: "high" }],
};

export function suggestInitiatives(level: EvolutionLevel, _stats: EvolutionStats): Initiative[] {
  return INITIATIVES_BY_LEVEL[level] ?? [];
}

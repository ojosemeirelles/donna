/**
 * Initiative suggestions — proactive recommendations based on usage patterns.
 */

import type { EvolutionLevel } from "./level.js";
import type { EvolutionStats } from "./tracker.js";

export type Initiative = {
  text: string;
  priority: "high" | "medium" | "low";
};

const INITIATIVES_BY_LEVEL: Record<number, Initiative[]> = {
  1: [
    { text: "Configure seu canal de mensagens preferido para conversar com a Donna", priority: "high" },
    { text: "Experimente pedir um resumo matinal configurando o Morning Brief", priority: "medium" },
  ],
  2: [
    { text: "Diga seu nome para a Donna — ela vai lembrar na próxima vez", priority: "high" },
    { text: "Configure preferências de idioma e tom de comunicação", priority: "medium" },
    { text: "Experimente usar a Donna para tarefas de busca e pesquisa", priority: "low" },
  ],
  3: [
    { text: "Peça para a Donna analisar seus padrões de uso e sugerir melhorias", priority: "high" },
    { text: "Configure automações baseadas nos seus horários de pico", priority: "medium" },
    { text: "Explore skills avançadas como web search e code generation", priority: "low" },
  ],
  4: [
    { text: "Ative ciclos autônomos para tarefas recorrentes", priority: "high" },
    { text: "Configure projetos de longo prazo para a Donna acompanhar", priority: "medium" },
  ],
  5: [
    { text: "Sua Donna está no nível máximo — considere configurar operação 24/7", priority: "high" },
    { text: "Configure relatórios automáticos para stakeholders", priority: "medium" },
  ],
};

/** Get initiative suggestions based on current level and stats. */
export function suggestInitiatives(
  level: EvolutionLevel,
  stats: EvolutionStats,
): Initiative[] {
  const initiatives = INITIATIVES_BY_LEVEL[level] ?? [];

  // Filter out initiatives that don't apply
  return initiatives.filter((init) => {
    // If user has many skills, skip "explore skills" suggestions
    if (stats.skillsUsed.length > 5 && init.text.includes("Explore skills")) {
      return false;
    }
    return true;
  });
}

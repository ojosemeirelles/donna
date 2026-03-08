/**
 * Insights generator — analyzes evolution stats to produce human-readable insights.
 */

import type { EvolutionStats } from "./tracker.js";

export type Insight = {
  text: string;
  category: "usage" | "pattern" | "growth";
};

/** Generate insights from evolution stats for the weekly report. */
export function generateInsights(
  stats: EvolutionStats,
  weekStats?: { interactions: number; newSkills: string[] },
): Insight[] {
  const insights: Insight[] = [];

  // Usage insights
  if (stats.totalInteractions > 0) {
    const avgPerDay = stats.daysActive > 0
      ? Math.round(stats.totalInteractions / stats.daysActive)
      : 0;
    insights.push({
      text: `Média de ${avgPerDay} interações por dia ativo`,
      category: "usage",
    });
  }

  // Skills diversity
  if (stats.skillsUsed.length > 0) {
    insights.push({
      text: `${stats.skillsUsed.length} habilidades diferentes utilizadas: ${stats.skillsUsed.slice(0, 5).join(", ")}`,
      category: "pattern",
    });
  }

  // Weekly comparison
  if (weekStats) {
    if (weekStats.interactions > 0) {
      insights.push({
        text: `${weekStats.interactions} interações esta semana`,
        category: "growth",
      });
    }
    if (weekStats.newSkills.length > 0) {
      insights.push({
        text: `Novas habilidades exploradas: ${weekStats.newSkills.join(", ")}`,
        category: "growth",
      });
    }
  }

  // Consistency insight
  if (stats.daysActive >= 7) {
    const daysSinceFirst = Math.max(
      1,
      Math.ceil((Date.now() - new Date(stats.firstSeenAt).getTime()) / (24 * 60 * 60 * 1000)),
    );
    const consistency = Math.round((stats.daysActive / daysSinceFirst) * 100);
    insights.push({
      text: `Consistência de uso: ${consistency}% dos dias`,
      category: "pattern",
    });
  }

  return insights.slice(0, 5); // max 5 insights per report
}

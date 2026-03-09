/**
 * Weekly Evolution Report — Solo Leveling themed.
 */

import { suggestInitiatives, type Initiative } from "./initiatives.js";
import { generateInsights, type Insight } from "./insights.js";
import type { EvolutionLevel } from "./level.js";
import { getLevelDefinition } from "./level.js";
import type { EvolutionStats } from "./tracker.js";

export type WeeklyReportData = {
  weekNumber: number;
  level: EvolutionLevel;
  rank: string;
  title: string;
  stats: EvolutionStats;
  weekInteractions: number;
  insights: Insight[];
  initiatives: Initiative[];
  nextLevelProgress: {
    nextLevel: EvolutionLevel | null;
    nextRank: string | null;
    nextTitle: string | null;
    currentXp: number;
    requiredXp: number;
    progressPercent: number;
  };
};

export function calculateWeekNumber(firstSeenAt: string): number {
  const start = new Date(firstSeenAt).getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - start) / (7 * 24 * 60 * 60 * 1000)));
}

/** Generate XP progress bar. */
function xpBar(current: number, required: number, width = 20): string {
  if (required <= 0) {
    return "X".repeat(width) + " MAX";
  }
  const pct = Math.min(current / required, 1);
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return "X".repeat(filled) + "-".repeat(empty) + ` ${Math.round(pct * 100)}%`;
}

export function buildReportData(
  level: EvolutionLevel,
  stats: EvolutionStats,
  weekInteractions?: number,
): WeeklyReportData {
  const def = getLevelDefinition(level);
  const weekNum = calculateWeekNumber(stats.firstSeenAt);
  const insights = generateInsights(stats, {
    interactions: weekInteractions ?? 0,
    newSkills: [],
  });
  const initiatives = suggestInitiatives(level, stats);

  let nextLevelProgress: WeeklyReportData["nextLevelProgress"];
  if (level >= 8) {
    nextLevelProgress = {
      nextLevel: null,
      nextRank: null,
      nextTitle: null,
      currentXp: stats.xp,
      requiredXp: 0,
      progressPercent: 100,
    };
  } else {
    const nextLevel = (level + 1) as EvolutionLevel;
    const nextDef = getLevelDefinition(nextLevel);
    const currentXp = stats.xp - def.xpRequired;
    const neededXp = nextDef.xpRequired - def.xpRequired;
    nextLevelProgress = {
      nextLevel,
      nextRank: nextDef.rank,
      nextTitle: nextDef.title,
      currentXp: stats.xp,
      requiredXp: nextDef.xpRequired,
      progressPercent: neededXp > 0 ? Math.round((currentXp / neededXp) * 100) : 0,
    };
  }

  return {
    weekNumber: weekNum,
    level,
    rank: def.rank,
    title: def.title,
    stats,
    weekInteractions: weekInteractions ?? 0,
    insights,
    initiatives,
    nextLevelProgress,
  };
}

export function formatReportTelegram(data: WeeklyReportData): string {
  const lines: string[] = [];
  const def = getLevelDefinition(data.level);

  lines.push(`*DONNA -- Relatorio de Evolucao*`);
  lines.push(`Semana ${data.weekNumber} | Rank ${data.rank} -- ${data.title}`);
  lines.push(`_${def.description}_`);
  lines.push("");

  // XP Progress
  lines.push(`*XP: ${data.stats.xp.toLocaleString("pt-BR")}*`);
  if (data.nextLevelProgress.nextRank) {
    lines.push(xpBar(data.stats.xp, data.nextLevelProgress.requiredXp));
    lines.push(
      `Proximo: Rank ${data.nextLevelProgress.nextRank} (${data.nextLevelProgress.requiredXp.toLocaleString("pt-BR")} XP)`,
    );
  } else {
    lines.push(`${xpBar(1, 1)} RANK MAXIMO`);
  }
  lines.push("");

  // Stats
  lines.push(`*Stats:*`);
  lines.push(`- Mensagens: ${data.stats.totalInteractions}`);
  lines.push(`- Tarefas: ${data.stats.tasksCompleted}`);
  lines.push(`- Erros resolvidos: ${data.stats.errorsResolved}`);
  lines.push(`- Dias ativos: ${data.stats.daysActive}`);
  lines.push(`- Streak: ${data.stats.streakDays} dias`);
  lines.push(`- Skills: ${data.stats.skillsUsed.length}`);
  lines.push("");

  // Insights
  if (data.insights.length > 0) {
    lines.push(`*Insights:*`);
    for (const insight of data.insights.slice(0, 3)) {
      lines.push(`- ${insight.text}`);
    }
    lines.push("");
  }

  // Skills unlocked
  lines.push(`*Skills ativas:*`);
  lines.push(def.unlocks.map((u) => `- ${u}`).join("\n"));
  lines.push("");

  // Initiative
  if (data.initiatives.length > 0) {
    lines.push(`*Proximo passo:*`);
    lines.push(data.initiatives[0].text);
  }

  lines.push("");
  lines.push(`---`);
  lines.push(`_Donna Solo Leveling System v1.0_`);

  return lines.join("\n");
}

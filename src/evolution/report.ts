/**
 * Weekly Evolution Report — generates a formatted report for Telegram delivery.
 */

import type { EvolutionLevel } from "./level.js";
import { getLevelDefinition, LEVEL_DEFINITIONS } from "./level.js";
import type { EvolutionStats } from "./tracker.js";
import { generateInsights, type Insight } from "./insights.js";
import { suggestInitiatives, type Initiative } from "./initiatives.js";
import { evaluateProgression } from "./progression.js";

export type WeeklyReportData = {
  weekNumber: number;
  level: EvolutionLevel;
  levelName: string;
  stats: EvolutionStats;
  weekInteractions: number;
  insights: Insight[];
  initiatives: Initiative[];
  nextLevelProgress: {
    nextLevel: EvolutionLevel | null;
    nextLevelName: string | null;
    remainingInteractions: number;
    remainingDays: number;
  };
};

/** Calculate which week we're on since first interaction. */
export function calculateWeekNumber(firstSeenAt: string): number {
  const start = new Date(firstSeenAt).getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - start) / (7 * 24 * 60 * 60 * 1000)));
}

/** Build the weekly report data. */
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

  // Next level progress
  const progression = evaluateProgression(level, stats);
  let nextLevelProgress: WeeklyReportData["nextLevelProgress"];

  if (level >= 5) {
    nextLevelProgress = {
      nextLevel: null,
      nextLevelName: null,
      remainingInteractions: 0,
      remainingDays: 0,
    };
  } else {
    const nextLevel = (level + 1) as EvolutionLevel;
    const nextDef = LEVEL_DEFINITIONS.find((d) => d.level === nextLevel)!;
    nextLevelProgress = {
      nextLevel,
      nextLevelName: nextDef.name,
      remainingInteractions: Math.max(0, nextDef.criteria.minInteractions - stats.totalInteractions),
      remainingDays: Math.max(0, nextDef.criteria.minDaysActive - stats.daysActive),
    };
  }

  return {
    weekNumber: weekNum,
    level,
    levelName: def.name,
    stats,
    weekInteractions: weekInteractions ?? 0,
    insights,
    initiatives,
    nextLevelProgress,
  };
}

/** Format the report as Telegram-compatible markdown. */
export function formatReportTelegram(data: WeeklyReportData): string {
  const lines: string[] = [];

  lines.push(`⚔️ *Donna — Relatório de Evolução*`);
  lines.push(`Semana ${data.weekNumber} | Nível ${data.level} — ${data.levelName}`);
  lines.push("");

  // Progress
  lines.push(`📈 *Progresso esta semana:*`);
  lines.push(`• ${data.weekInteractions} interações`);
  lines.push(`• ${data.stats.totalInteractions} interações totais`);
  lines.push(`• ${data.stats.daysActive} dias ativos`);
  lines.push(`• ${data.stats.skillsUsed.length} habilidades usadas`);
  lines.push("");

  // Insights
  if (data.insights.length > 0) {
    lines.push(`🧠 *O que aprendi sobre você:*`);
    for (const insight of data.insights.slice(0, 3)) {
      lines.push(`• ${insight.text}`);
    }
    lines.push("");
  }

  // Next level
  if (data.nextLevelProgress.nextLevel) {
    lines.push(`🔓 *Próximo desbloqueio:*`);
    const parts: string[] = [];
    if (data.nextLevelProgress.remainingInteractions > 0) {
      parts.push(`${data.nextLevelProgress.remainingInteractions} interações`);
    }
    if (data.nextLevelProgress.remainingDays > 0) {
      parts.push(`${data.nextLevelProgress.remainingDays} dias`);
    }
    if (parts.length > 0) {
      lines.push(`Faltam ${parts.join(" e ")} para "${data.nextLevelProgress.nextLevelName}"`);
    } else {
      lines.push(`Pronto para evoluir para "${data.nextLevelProgress.nextLevelName}"!`);
    }
    lines.push("");
  } else {
    lines.push(`🏆 *Nível máximo alcançado!*`);
    lines.push("");
  }

  // Initiative
  if (data.initiatives.length > 0) {
    lines.push(`💡 *Iniciativa sugerida:*`);
    lines.push(data.initiatives[0]!.text);
  }

  return lines.join("\n");
}

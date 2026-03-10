/**
 * Celebration Engine — tracks and celebrates wins, streaks, and milestones.
 * Data stored at ~/.donna/soul/milestones.json
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CelebrationData, Milestone, Streak } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const MILESTONES_PATH = path.join(SOUL_DIR, "milestones.json");

const MAX_RECENT_WINS = 50;
// 36 hours in ms
const STREAK_WINDOW_MS = 36 * 60 * 60 * 1000;
// 7 days in ms
const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const WIN_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(?:consegui)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:fechei)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:ganhei)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:vendi)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:lancei)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:completei)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:terminei)\s+(.+?)(?:\.|!|$)/i,
  /\b(?:batemos\s+a\s+meta)\b/i,
  /\b(?:primeiro\s+cliente)\b/i,
  /\b(?:atingi)\s+(.+?)(?:\.|!|$)/i,
];

const CELEBRATION_MESSAGES: ReadonlyArray<string> = [
  "Isso e enorme. Parabens!",
  "Mais uma vitoria no radar. Bem feito!",
  "Voce merece esse reconhecimento. Excelente!",
  "Esse e o tipo de coisa que importa. Parabens!",
  "Mais um passo na direcao certa. Muito bom!",
  "Momento pra celebrar. Voce conquistou isso!",
  "Resultado que fala por si. Parabens!",
  "Orgulho dessa conquista. Continue assim!",
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultCelebrationData(): CelebrationData {
  return {
    streaks: [],
    milestones: [],
    recentWins: [],
    lastUpdated: 0,
  };
}

export async function loadCelebrations(): Promise<CelebrationData> {
  try {
    const raw = await fs.readFile(MILESTONES_PATH, "utf-8");
    return JSON.parse(raw) as CelebrationData;
  } catch {
    return defaultCelebrationData();
  }
}

export async function saveCelebrations(data: CelebrationData): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
  await fs.writeFile(MILESTONES_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function detectWin(message: string): { detected: boolean; text: string } | null {
  for (const pattern of WIN_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      const text = match[1]?.trim() || match[0].trim();
      return { detected: true, text };
    }
  }
  return null;
}

export function recordWin(data: CelebrationData, text: string): CelebrationData {
  const now = Date.now();
  const recentWins = [{ text, date: now }, ...data.recentWins];

  return {
    ...data,
    recentWins: recentWins.slice(0, MAX_RECENT_WINS),
    lastUpdated: now,
  };
}

export function updateStreak(data: CelebrationData, streakId: string): CelebrationData {
  const now = Date.now();
  const streaks = data.streaks.map((s) => {
    if (s.id !== streakId) { return s; }

    const timeSinceLastCheckin = now - s.lastCheckin;

    if (timeSinceLastCheckin <= STREAK_WINDOW_MS) {
      // Within window: increment
      const newCount = s.currentCount + 1;
      return {
        ...s,
        currentCount: newCount,
        longestCount: Math.max(s.longestCount, newCount),
        lastCheckin: now,
        active: true,
      };
    }

    // Gap too large: reset streak, record longest
    return {
      ...s,
      longestCount: Math.max(s.longestCount, s.currentCount),
      currentCount: 1,
      lastCheckin: now,
      active: true,
    };
  });

  return { ...data, streaks, lastUpdated: now };
}

export function createStreak(data: CelebrationData, label: string): CelebrationData {
  const now = Date.now();
  const streak: Streak = {
    id: generateId(),
    label,
    currentCount: 1,
    longestCount: 1,
    lastCheckin: now,
    startedAt: now,
    active: true,
  };

  return {
    ...data,
    streaks: [...data.streaks, streak],
    lastUpdated: now,
  };
}

export function addMilestone(data: CelebrationData, label: string, category: string): CelebrationData {
  const now = Date.now();
  const milestone: Milestone = {
    id: generateId(),
    label,
    date: now,
    category,
    celebrated: false,
  };

  return {
    ...data,
    milestones: [...data.milestones, milestone],
    lastUpdated: now,
  };
}

export function getUpcomingMilestones(data: CelebrationData): Milestone[] {
  const now = Date.now();
  const upcoming: Milestone[] = [];

  for (const m of data.milestones) {
    const anniversary = getNextAnniversary(m.date);
    if (anniversary !== null) {
      const diff = anniversary - now;
      if (diff >= 0 && diff <= UPCOMING_WINDOW_MS) {
        upcoming.push(m);
      }
    }
  }

  return upcoming;
}

export function formatCelebrationMessage(win: string): string {
  const idx = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
  const base = CELEBRATION_MESSAGES[idx];
  return `${base}\n> ${win}`;
}

export function formatCelebrationReport(data: CelebrationData): string {
  const lines: string[] = ["== Relatorio de Celebracoes ==", ""];

  // Active streaks
  const activeStreaks = data.streaks.filter((s) => s.active);
  if (activeStreaks.length > 0) {
    lines.push("--- Streaks Ativos ---");
    for (const s of activeStreaks) {
      lines.push(
        `  ${s.label}: ${s.currentCount} dias consecutivos (recorde: ${s.longestCount})`,
      );
    }
    lines.push("");
  }

  // Recent wins
  if (data.recentWins.length > 0) {
    lines.push(`--- Vitorias Recentes (${Math.min(data.recentWins.length, 10)}) ---`);
    for (const w of data.recentWins.slice(0, 10)) {
      const date = new Date(w.date).toLocaleDateString("pt-BR");
      lines.push(`  - ${w.text} (${date})`);
    }
    lines.push("");
  }

  // Upcoming milestone anniversaries
  const upcoming = getUpcomingMilestones(data);
  if (upcoming.length > 0) {
    lines.push("--- Marcos Proximos ---");
    for (const m of upcoming) {
      const anniversary = getNextAnniversary(m.date);
      if (anniversary !== null) {
        const daysUntil = Math.ceil((anniversary - Date.now()) / (24 * 60 * 60 * 1000));
        lines.push(
          daysUntil === 0
            ? `  Hoje: aniversario de "${m.label}" [${m.category}]`
            : `  Em ${daysUntil} dia(s): aniversario de "${m.label}" [${m.category}]`,
        );
      }
    }
    lines.push("");
  }

  if (lines.length <= 2) {
    return "Nenhuma celebracao registrada ainda. Conte suas vitorias!";
  }

  return lines.join("\n");
}

// --- Internal helpers ---

function getNextAnniversary(timestamp: number): number | null {
  try {
    const original = new Date(timestamp);
    const now = new Date();
    const thisYear = new Date(
      now.getFullYear(),
      original.getMonth(),
      original.getDate(),
    );

    // If this year's anniversary already passed, use next year
    if (thisYear.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      return new Date(
        now.getFullYear() + 1,
        original.getMonth(),
        original.getDate(),
      ).getTime();
    }

    return thisYear.getTime();
  } catch {
    return null;
  }
}

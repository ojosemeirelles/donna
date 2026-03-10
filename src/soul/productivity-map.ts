import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ProductivityRhythms, HourlyEnergy, DayPattern, VoiceSnapshot } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const RHYTHMS_PATH = path.join(SOUL_DIR, "rhythms.json");

const DAY_NAMES = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function defaultRhythms(): ProductivityRhythms {
  return {
    hourly: [],
    daily: [],
    peakHours: [],
    peakDays: [],
    currentCycle: "normal",
    cycleStartDate: Date.now(),
    dataPoints: 0,
    lastUpdated: Date.now(),
  };
}

export async function loadRhythms(): Promise<ProductivityRhythms> {
  try {
    const raw = await fs.readFile(RHYTHMS_PATH, "utf-8");
    return JSON.parse(raw) as ProductivityRhythms;
  } catch {
    return defaultRhythms();
  }
}

export async function saveRhythms(rhythms: ProductivityRhythms): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
  rhythms.lastUpdated = Date.now();
  await fs.writeFile(RHYTHMS_PATH, JSON.stringify(rhythms, null, 2), "utf-8");
}

function energyToNumeric(energy: VoiceSnapshot["energy"]): number {
  switch (energy) {
    case "high": return 9;
    case "medium": return 6;
    case "low": return 3;
    case "depleted": return 1;
  }
}

function moodToComplexity(mood: VoiceSnapshot["mood"]): number {
  switch (mood) {
    case "focused": return 8;
    case "reflective": return 5;
    case "excited": return 7;
    case "neutral": return 5;
    case "rushed": return 4;
    case "anxious": return 3;
    case "frustrated": return 2;
  }
}

function runningAvg(current: number, newVal: number, count: number): number {
  return (current * (count - 1) + newVal) / count;
}

export function recordDataPoint(rhythms: ProductivityRhythms, snapshot: VoiceSnapshot): ProductivityRhythms {
  const date = new Date(snapshot.timestamp);
  const hour = date.getHours();
  const day = date.getDay();
  const energyNum = energyToNumeric(snapshot.energy);
  const complexityNum = moodToComplexity(snapshot.mood);

  const updated = { ...rhythms };
  updated.hourly = [...rhythms.hourly];
  updated.daily = [...rhythms.daily];

  // Update hourly entry
  let hourEntry = updated.hourly.find((h) => h.hour === hour);
  if (!hourEntry) {
    hourEntry = { hour, avgEnergy: 0, avgComplexity: 0, messageCount: 0 };
    updated.hourly.push(hourEntry);
  }
  hourEntry.messageCount++;
  hourEntry.avgEnergy = runningAvg(hourEntry.avgEnergy, energyNum, hourEntry.messageCount);
  hourEntry.avgComplexity = runningAvg(hourEntry.avgComplexity, complexityNum, hourEntry.messageCount);

  // Update daily entry
  let dayEntry = updated.daily.find((d) => d.day === day);
  if (!dayEntry) {
    dayEntry = { day, avgEnergy: 0, avgProductivity: 0, messageCount: 0 };
    updated.daily.push(dayEntry);
  }
  dayEntry.messageCount++;
  dayEntry.avgEnergy = runningAvg(dayEntry.avgEnergy, energyNum, dayEntry.messageCount);
  dayEntry.avgProductivity = runningAvg(dayEntry.avgProductivity, complexityNum, dayEntry.messageCount);

  updated.dataPoints++;

  // Recalculate peak hours (top 3 by avgEnergy)
  const sortedHours = [...updated.hourly].sort((a, b) => b.avgEnergy - a.avgEnergy);
  updated.peakHours = sortedHours.slice(0, 3).map((h) => h.hour);

  // Recalculate peak days (top 2 by avgEnergy)
  const sortedDays = [...updated.daily].sort((a, b) => b.avgEnergy - a.avgEnergy);
  updated.peakDays = sortedDays.slice(0, 2).map((d) => d.day);

  // Update current cycle based on last 3 days vs overall average
  const overallAvg = updated.hourly.reduce((sum, h) => sum + h.avgEnergy, 0) / (updated.hourly.length || 1);
  const now = Date.now();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  // Approximate recent energy from hourly data weighted by recency
  // Since we don't store per-timestamp data, use the current snapshot's energy as a proxy
  const recentHours = updated.hourly.filter((h) => {
    const hourDiff = Math.abs(h.hour - hour);
    return hourDiff <= 3 || hourDiff >= 21; // nearby hours as proxy for recent
  });
  const recentAvg = recentHours.length > 0
    ? recentHours.reduce((sum, h) => sum + h.avgEnergy, 0) / recentHours.length
    : overallAvg;

  if (recentAvg > overallAvg * 1.2) {
    updated.currentCycle = "high";
  } else if (recentAvg < overallAvg * 0.8) {
    updated.currentCycle = "low";
  } else {
    updated.currentCycle = "normal";
  }

  updated.lastUpdated = Date.now();
  return updated;
}

export function hasEnoughData(rhythms: ProductivityRhythms): boolean {
  return rhythms.dataPoints >= 50;
}

function energyBar(value: number): string {
  const filled = Math.round(value);
  const empty = 10 - filled;
  return "[" + "#".repeat(filled) + ".".repeat(Math.max(0, empty)) + "]";
}

function formatHourRange(start: number, end: number): string {
  return `${String(start).padStart(2, "0")}h-${String(end).padStart(2, "0")}h`;
}

export function generateProductivityMap(rhythms: ProductivityRhythms): string {
  if (rhythms.dataPoints === 0) {
    return "Ainda nao ha dados suficientes para gerar seu mapa de produtividade.";
  }

  const lines: string[] = [];
  lines.push("=== Mapa de Produtividade ===\n");

  // Peak hours
  if (rhythms.peakHours.length > 0) {
    const peakLabels = rhythms.peakHours.map((h) => `${h}h`).join(", ");
    lines.push(`Horarios de pico: ${peakLabels}`);
  }

  // Best days
  if (rhythms.peakDays.length > 0) {
    const dayLabels = rhythms.peakDays.map((d) => DAY_NAMES[d]).join(", ");
    lines.push(`Melhores dias: ${dayLabels}`);
  }

  // Current cycle
  const cycleLabel = rhythms.currentCycle === "high" ? "Alto" : rhythms.currentCycle === "low" ? "Baixo" : "Normal";
  lines.push(`Ciclo atual: ${cycleLabel}\n`);

  // ASCII energy bars by time block
  const blocks = [
    { label: "Manha   (6-12h)", start: 6, end: 12 },
    { label: "Tarde   (12-18h)", start: 12, end: 18 },
    { label: "Noite   (18-23h)", start: 18, end: 23 },
    { label: "Madrugada(0-6h)", start: 0, end: 6 },
  ];

  lines.push("Energia por periodo:");
  for (const block of blocks) {
    const blockHours = rhythms.hourly.filter((h) => h.hour >= block.start && h.hour < block.end);
    const avg = blockHours.length > 0
      ? blockHours.reduce((sum, h) => sum + h.avgEnergy, 0) / blockHours.length
      : 0;
    lines.push(`  ${block.label} ${energyBar(avg)} ${avg.toFixed(1)}`);
  }

  // Suggestions
  lines.push("\n--- Sugestoes ---");
  if (rhythms.peakHours.length > 0) {
    const peakStart = Math.min(...rhythms.peakHours);
    const peakEnd = Math.max(...rhythms.peakHours) + 1;
    lines.push(`Suas ${formatHourRange(peakStart, peakEnd)} sao seu periodo de pico. Agende tarefas dificeis aqui.`);
  }

  // Find low energy days
  const sortedDaysAsc = [...rhythms.daily].sort((a, b) => a.avgEnergy - b.avgEnergy);
  if (sortedDaysAsc.length > 0 && sortedDaysAsc[0].avgEnergy < 5) {
    const lowDay = DAY_NAMES[sortedDaysAsc[0].day];
    lines.push(`${lowDay} sao consistentemente baixas. Evite decisoes importantes.`);
  }

  lines.push(`\nBaseado em ${rhythms.dataPoints} interacoes.`);
  return lines.join("\n");
}

export function getSchedulingSuggestion(
  rhythms: ProductivityRhythms,
  taskType: "heavy" | "light" | "creative" | "meeting",
): string {
  if (rhythms.hourly.length === 0) {
    return "Ainda nao tenho dados suficientes para sugerir horarios.";
  }

  const sorted = [...rhythms.hourly].sort((a, b) => b.avgEnergy - a.avgEnergy);

  switch (taskType) {
    case "heavy": {
      if (sorted.length === 0) return "Sem dados para sugerir.";
      const best = sorted[0];
      return `Tarefas pesadas: agende para ${best.hour}h, seu horario de maior energia (${best.avgEnergy.toFixed(1)}/10).`;
    }
    case "light": {
      return "Tarefas leves podem ser feitas em qualquer horario.";
    }
    case "creative": {
      // Second-highest energy period
      const creative = sorted.length >= 2 ? sorted[1] : sorted[0];
      return `Tarefas criativas: tente por volta das ${creative.hour}h, energia alta sem ser pico maximo.`;
    }
    case "meeting": {
      // Medium energy hours (middle of the sorted list)
      const mid = Math.floor(sorted.length / 2);
      const meetingHour = sorted[mid];
      return `Reunioes: agende para ${meetingHour.hour}h, energia media que permite interacao sem gastar seu pico.`;
    }
  }
}

export function detectEnergyAlert(
  rhythms: ProductivityRhythms,
  recentSnapshots: VoiceSnapshot[],
): string | null {
  if (recentSnapshots.length < 3) return null;

  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const recent = recentSnapshots.filter((s) => s.timestamp >= threeDaysAgo);

  if (recent.length < 3) return null;

  const recentAvg = recent.reduce((sum, s) => sum + energyToNumeric(s.energy), 0) / recent.length;
  const overallAvg = rhythms.hourly.length > 0
    ? rhythms.hourly.reduce((sum, h) => sum + h.avgEnergy, 0) / rhythms.hourly.length
    : 5;

  // Significantly below normal: more than 30% lower
  if (recentAvg < overallAvg * 0.7) {
    return "Voce esta num padrao de baixa energia ha 3 dias. O que esta acontecendo?";
  }

  return null;
}

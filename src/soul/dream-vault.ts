/**
 * Dream Vault — captures and tracks dreams, desires, and aspirations.
 * Data stored at ~/.donna/soul/dreams.json
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Dream, DreamStatus, DreamVault } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const DREAMS_PATH = path.join(SOUL_DIR, "dreams.json");

const RECURRING_MENTION_THRESHOLD = 3;

interface DreamDetection {
  detected: boolean;
  text: string;
  category: string;
}

const DREAM_PATTERNS: ReadonlyArray<RegExp> = [
  /\bum\s+dia\s+(?:quero|vou)\s+(.+?)(?:\.|!|$)/i,
  /\bsempre\s+quis\s+(.+?)(?:\.|!|$)/i,
  /\bmeu\s+sonho\s+[eé]\s+(.+?)(?:\.|!|$)/i,
  /\bmeu\s+sonho\s+era\s+(.+?)(?:\.|!|$)/i,
  /\bquando\s+tiver\s+tempo\s+vou\s+(.+?)(?:\.|!|$)/i,
  /\bprecisava\s+aprender\s+(.+?)(?:\.|!|$)/i,
  /\bqueria\s+muito\s+(.+?)(?:\.|!|$)/i,
  /\bgostaria\s+de\s+(.+?)(?:\.|!|$)/i,
  /\bplanejo\s+(.+?)(?:\.|!|$)/i,
  /\bmeu\s+plano\s+[eé]\s+(.+?)(?:\.|!|$)/i,
];

const CATEGORY_KEYWORDS: ReadonlyArray<{ keywords: RegExp; category: string }> = [
  { keywords: /\b(?:empresa|neg[oó]cio|emprego|carreira|promo[cç][aã]o|trabalho|startup)\b/i, category: "career" },
  { keywords: /\b(?:viagem|viajar|pa[ií]s|mundo|europa|[aá]sia|[aá]frica)\b/i, category: "travel" },
  { keywords: /\b(?:aprender|curso|estudar|faculdade|mestrado|doutorado|livro|ler)\b/i, category: "learning" },
  { keywords: /\b(?:sa[uú]de|academia|emagrecer|correr|maratona|exerc[ií]cio|dieta)\b/i, category: "health" },
  { keywords: /\b(?:dinheiro|investir|poupar|milh[aã]o|financeira?|aposentadoria|renda)\b/i, category: "financial" },
  { keywords: /\b(?:casar|filhos?|relacionamento|fam[ií]lia|namorar)\b/i, category: "relationship" },
  { keywords: /\b(?:m[uú]sica|pintura|arte|escrever|romance|filme|fotografia|criar)\b/i, category: "creative" },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function loadDreams(): Promise<DreamVault> {
  try {
    const raw = await fs.readFile(DREAMS_PATH, "utf-8");
    return JSON.parse(raw) as DreamVault;
  } catch {
    return { dreams: [], lastUpdated: 0 };
  }
}

export async function saveDreams(vault: DreamVault): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
  await fs.writeFile(DREAMS_PATH, JSON.stringify(vault, null, 2), "utf-8");
}

function inferCategory(text: string): string {
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.test(text)) { return category; }
  }
  return "personal";
}

export function detectDream(message: string): DreamDetection | null {
  for (const pattern of DREAM_PATTERNS) {
    const match = pattern.exec(message);
    if (match?.[1]) {
      const text = match[1].trim();
      const category = inferCategory(text);
      return { detected: true, text, category };
    }
  }
  return null;
}

/**
 * Checks if two dream texts are similar enough to be considered the same dream.
 * Uses simple word overlap heuristic.
 */
function isSimilarDream(a: string, b: string): boolean {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) { return false; }

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) { overlap++; }
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return smaller > 0 && overlap / smaller >= 0.5;
}

export function addDream(vault: DreamVault, text: string, category: string, context: string): DreamVault {
  const now = Date.now();
  const dreams = [...vault.dreams];

  // Check for similar existing dream
  const existingIdx = dreams.findIndex((d) => isSimilarDream(d.text, text));

  if (existingIdx >= 0) {
    const existing = { ...dreams[existingIdx] };
    existing.mentionCount += 1;
    existing.lastMentioned = now;
    // Reactivate dormant dreams when re-mentioned
    if (existing.status === "dormant") {
      existing.status = "active";
    }
    dreams[existingIdx] = existing;
  } else {
    dreams.push({
      id: generateId(),
      text,
      category,
      capturedAt: now,
      lastMentioned: now,
      mentionCount: 1,
      status: "active",
      context,
    });
  }

  return { dreams, lastUpdated: now };
}

export function getDreamReminders(vault: DreamVault): string[] {
  const now = Date.now();
  const reminders: string[] = [];

  for (const dream of vault.dreams) {
    if (dream.status !== "active") { continue; }

    const daysSinceMention = Math.floor((now - dream.lastMentioned) / (24 * 60 * 60 * 1000));

    if (daysSinceMention >= 30) {
      const weeks = Math.floor(daysSinceMention / 7);

      if (dream.mentionCount >= RECURRING_MENTION_THRESHOLD) {
        reminders.push(
          `[Prioridade] Voce mencionou ${dream.mentionCount} vezes que queria ${dream.text}. Ja se passaram ${weeks} semanas. Isso ainda esta no radar?`,
        );
      } else {
        reminders.push(
          `Voce mencionou ha ${weeks} semanas que queria ${dream.text}. Isso ainda esta no radar?`,
        );
      }
    }
  }

  return reminders;
}

export function achieveDream(vault: DreamVault, dreamId: string): DreamVault {
  const dreams = vault.dreams.map((d) =>
    d.id === dreamId ? { ...d, status: "achieved" as DreamStatus } : d,
  );
  return { dreams, lastUpdated: Date.now() };
}

export function formatDreamReport(vault: DreamVault): string {
  if (vault.dreams.length === 0) { return "Nenhum sonho registrado ainda."; }

  const active = vault.dreams.filter((d) => d.status === "active");
  const dormant = vault.dreams.filter((d) => d.status === "dormant");
  const achieved = vault.dreams.filter((d) => d.status === "achieved");

  const lines: string[] = ["== Cofre de Sonhos ==", ""];

  const formatDream = (d: Dream): string => {
    const date = new Date(d.capturedAt).toLocaleDateString("pt-BR");
    return `  - ${d.text} [${d.category}] (${d.mentionCount}x, desde ${date})`;
  };

  if (active.length > 0) {
    lines.push(`--- Ativos (${active.length}) ---`);
    for (const d of active) { lines.push(formatDream(d)); }
    lines.push("");
  }

  if (dormant.length > 0) {
    lines.push(`--- Dormentes (${dormant.length}) ---`);
    for (const d of dormant) { lines.push(formatDream(d)); }
    lines.push("");
  }

  if (achieved.length > 0) {
    lines.push(`--- Realizados (${achieved.length}) ---`);
    for (const d of achieved) { lines.push(formatDream(d)); }
    lines.push("");
  }

  return lines.join("\n");
}

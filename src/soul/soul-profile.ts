import { createReadStream } from "node:fs";
/**
 * Soul Profile — aggregates everything into a unified profile.
 * Manages the soul profile, observations log, and context generation.
 * Data stored at ~/.donna/soul/
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { SoulProfile, SoulContext, Observation } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const PROFILE_PATH = path.join(SOUL_DIR, "profile.json");
const OBSERVATIONS_PATH = path.join(SOUL_DIR, "observations.jsonl");

function createDefaultProfile(): SoulProfile {
  return {
    lastUpdated: Date.now(),
    psychometrics: null,
    currentState: {
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      dominantPattern: "none",
    },
    relationships: { healthy: [], needsAttention: [], avoided: [] },
    dreams: { active: [], dormant: [], achieved: [] },
    rhythms: { peakHours: [], peakDays: [], currentCycle: "normal" },
    patterns: { procrastinating: [], avoiding: [], strengths: [] },
    milestones: { upcoming: [], recent: [], streaks: [] },
    growthPlan: null,
    financePattern: "mixed",
    soulSummary: "",
  };
}

/** Create ~/.donna/soul/ directory if it does not exist. */
export async function ensureSoulDir(): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
}

/** Load the full soul profile from profile.json. Returns default if not found. */
export async function loadSoulProfile(): Promise<SoulProfile> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    return JSON.parse(raw) as SoulProfile;
  } catch {
    return createDefaultProfile();
  }
}

/** Save the soul profile to profile.json with pretty JSON. */
export async function saveSoulProfile(profile: SoulProfile): Promise<void> {
  await ensureSoulDir();
  await fs.writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");
}

/** Append an observation to the append-only observations.jsonl file. */
export async function appendObservation(obs: Observation): Promise<void> {
  await ensureSoulDir();
  const line = JSON.stringify(obs) + "\n";
  await fs.appendFile(OBSERVATIONS_PATH, line, "utf-8");
}

/** Load observations from the last N days. Reads line-by-line for large files. */
export async function loadRecentObservations(days: number): Promise<Observation[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const observations: Observation[] = [];

  try {
    await fs.access(OBSERVATIONS_PATH);
  } catch {
    return observations;
  }

  return new Promise((resolve) => {
    const stream = createReadStream(OBSERVATIONS_PATH, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      if (!line.trim()) {
        return;
      }
      try {
        const obs = JSON.parse(line) as Observation;
        if (obs.timestamp >= cutoff) {
          observations.push(obs);
        }
      } catch {
        // Skip malformed lines
      }
    });

    rl.on("close", () => resolve(observations));
    rl.on("error", () => resolve(observations));
  });
}

/** Build a lightweight SoulContext from the profile for prompt injection. */
export function buildSoulContext(profile: SoulProfile): SoulContext {
  const { currentState, patterns, dreams, relationships } = profile;

  // Determine active pattern
  let activePattern: string | null = null;
  if (patterns.procrastinating.length > 0) {
    activePattern = `procrastinando: ${patterns.procrastinating[0]}`;
  } else if (patterns.avoiding.length > 0) {
    activePattern = `evitando: ${patterns.avoiding[0]}`;
  }

  // Recent dream
  const recentDream = dreams.active.length > 0 ? dreams.active[0] : null;

  // Relationship alert
  let relationshipAlert: string | null = null;
  if (relationships.needsAttention.length > 0) {
    relationshipAlert = `${relationships.needsAttention[0]} precisa de atencao.`;
  }

  // Generate adaptation hint
  const adaptationHint = generateContextHint(
    currentState.energy,
    currentState.mood,
    currentState.stressLevel,
    activePattern,
  );

  return {
    energy: currentState.energy,
    mood: currentState.mood,
    stressLevel: currentState.stressLevel,
    activePattern,
    recentDream,
    relationshipAlert,
    adaptationHint,
  };
}

function generateContextHint(
  energy: string,
  mood: string,
  stressLevel: number,
  activePattern: string | null,
): string {
  const hints: string[] = [];

  if (energy === "depleted") {
    hints.push("Energia baixa — respostas curtas e praticas.");
  } else if (energy === "high") {
    hints.push("Energia alta — aproveite o momentum.");
  }

  if (stressLevel >= 7) {
    hints.push("Estresse elevado — seja direto, resolva primeiro.");
  }

  if (mood === "frustrated") {
    hints.push("Frustrado — reconheca e ofereca solucao.");
  } else if (mood === "anxious") {
    hints.push("Ansioso — transmita calma, quebre em passos.");
  } else if (mood === "excited") {
    hints.push("Empolgado — celebre e canalize a energia.");
  }

  if (activePattern) {
    hints.push(`Padrao ativo: ${activePattern}.`);
  }

  if (hints.length === 0) {
    return "Tom equilibrado. Adapte conforme a conversa evolui.";
  }

  return hints.join(" ");
}

/** Generate a 3-sentence summary of who the user is right now. */
export function generateSoulSummary(profile: SoulProfile): string {
  const { currentState, patterns, dreams, financePattern } = profile;
  const parts: string[] = [];

  // Sentence 1: current state
  const moodLabel: Record<string, string> = {
    focused: "focado",
    anxious: "ansioso",
    excited: "empolgado",
    frustrated: "frustrado",
    reflective: "reflexivo",
    rushed: "apressado",
    neutral: "estavel",
  };
  const energyLabel: Record<string, string> = {
    high: "alta",
    medium: "media",
    low: "baixa",
    depleted: "esgotada",
  };

  parts.push(
    `Estado atual: ${moodLabel[currentState.mood] ?? currentState.mood}, energia ${energyLabel[currentState.energy] ?? currentState.energy}, estresse ${currentState.stressLevel}/10.`,
  );

  // Sentence 2: dominant patterns
  const activePatterns: string[] = [];
  if (patterns.procrastinating.length > 0) {
    activePatterns.push(`procrastinando em ${patterns.procrastinating.length} area(s)`);
  }
  if (patterns.avoiding.length > 0) {
    activePatterns.push(`evitando ${patterns.avoiding.length} tema(s)`);
  }
  if (patterns.strengths.length > 0) {
    activePatterns.push(`forcas em ${patterns.strengths.length} area(s)`);
  }

  if (activePatterns.length > 0) {
    parts.push(`Padroes: ${activePatterns.join(", ")}.`);
  } else {
    parts.push("Nenhum padrao dominante detectado ainda.");
  }

  // Sentence 3: dreams + finance
  const dreamCount = dreams.active.length;
  if (dreamCount > 0 || financePattern !== "mixed") {
    const dreamPart = dreamCount > 0 ? `${dreamCount} sonho(s) ativo(s)` : "";
    const financePart = financePattern !== "mixed" ? `padrao financeiro ${financePattern}` : "";
    const combined = [dreamPart, financePart].filter(Boolean).join(", ");
    parts.push(combined ? `Contexto: ${combined}.` : "");
  }

  return parts.filter(Boolean).join(" ");
}

/** Delete the entire ~/.donna/soul/ directory. For privacy. */
export async function deleteSoulData(): Promise<void> {
  try {
    await fs.rm(SOUL_DIR, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
}

/** Export complete soul data as a JSON string. */
export async function exportSoulData(): Promise<string> {
  const profile = await loadSoulProfile();
  const observations = await loadRecentObservations(365);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    observations,
  };

  return JSON.stringify(exportData, null, 2);
}

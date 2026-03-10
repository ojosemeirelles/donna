import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  PsychometricProfile,
  OceanProfile,
  DISCProfile,
  GeniusZoneProfile,
  Observation,
  SoulProfile,
} from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const PROFILE_PATH = path.join(SOUL_DIR, "profile.json");

async function ensureSoulDir(): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
}

async function readProfileFile(): Promise<SoulProfile | null> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    return JSON.parse(raw) as SoulProfile;
  } catch {
    return null;
  }
}

async function writeProfileFile(profile: SoulProfile): Promise<void> {
  await ensureSoulDir();
  await fs.writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");
}

/** Load psychometric profile from ~/.donna/soul/profile.json */
export async function loadPsychometricProfile(): Promise<PsychometricProfile | null> {
  const soul = await readProfileFile();
  return soul?.psychometrics ?? null;
}

/** Save psychometric profile to ~/.donna/soul/profile.json */
export async function savePsychometricProfile(profile: PsychometricProfile): Promise<void> {
  let soul = await readProfileFile();
  if (!soul) {
    soul = createDefaultSoulProfile();
  }
  soul.psychometrics = profile;
  soul.lastUpdated = Date.now();
  await writeProfileFile(soul);
}

function createDefaultSoulProfile(): SoulProfile {
  return {
    lastUpdated: Date.now(),
    psychometrics: null,
    currentState: { energy: "medium", mood: "neutral", stressLevel: 3, dominantPattern: "none" },
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

// --- Signal helpers ---

function extractText(obs: Observation): string {
  return `${obs.messageExcerpt} ${String((obs.data as Record<string, unknown>)["text"] ?? "")}`.toLowerCase();
}

function countSignals(observations: Observation[], patterns: string[]): number {
  let count = 0;
  for (const obs of observations) {
    const text = extractText(obs);
    for (const p of patterns) {
      if (text.includes(p)) count++;
    }
  }
  return count;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scaleToHundred(signalCount: number, total: number, base: number): number {
  if (total === 0) return base;
  const ratio = signalCount / total;
  return clamp(Math.round(base + ratio * 80), 0, 100);
}

// --- OCEAN ---

const OPENNESS_SIGNALS = [
  "ideia", "imagina", "e se", "novo", "diferente", "criativo", "experimentar",
  "curioso", "interessante", "metáfora", "analogia",
];
const CONSCIENTIOUSNESS_SIGNALS = [
  "deadline", "prazo", "organiz", "agenda", "planej", "checklist", "prioridade",
  "cronograma", "compromisso", "terminei", "entreguei",
];
const EXTRAVERSION_SIGNALS = [
  "galera", "pessoal", "evento", "festa", "grupo", "reunião", "call",
  "encontr", "conversar", "networking",
];
const AGREEABLENESS_POSITIVE = ["vamos", "nós", "juntos", "colabor", "ajudar", "apoiar", "equipe"];
const AGREEABLENESS_NEGATIVE = ["faça", "preciso que", "quero que", "exijo"];
const NEUROTICISM_SIGNALS = [
  "ansied", "preocup", "medo", "insegur", "dúvida", "estresse", "pressão",
  "não consigo", "fracass", "erro meu",
];

export function updateOceanFromObservations(observations: Observation[]): OceanProfile {
  const total = observations.length;
  const base = 50;

  const openness = scaleToHundred(countSignals(observations, OPENNESS_SIGNALS), total, base);
  const conscientiousness = scaleToHundred(countSignals(observations, CONSCIENTIOUSNESS_SIGNALS), total, base);
  const extraversion = scaleToHundred(countSignals(observations, EXTRAVERSION_SIGNALS), total, base);

  const agreePos = countSignals(observations, AGREEABLENESS_POSITIVE);
  const agreeNeg = countSignals(observations, AGREEABLENESS_NEGATIVE);
  const agreeableness = clamp(Math.round(base + ((agreePos - agreeNeg) / Math.max(total, 1)) * 60), 0, 100);

  const neuroticism = scaleToHundred(countSignals(observations, NEUROTICISM_SIGNALS), total, base);

  return { openness, conscientiousness, extraversion, agreeableness, neuroticism };
}

// --- DISC ---

const D_SIGNALS = ["quero", "preciso", "agora", "resultado", "meta", "ganhar", "vencer", "competir"];
const I_SIGNALS = ["incrível", "animado", "empolgado", "convencer", "influenci", "motivar", "entusiasm"];
const S_SIGNALS = ["calma", "paciência", "consistente", "rotina", "equipe", "estabilidade", "confiança"];
const C_SIGNALS = ["dados", "detalhe", "processo", "análise", "precisão", "qualidade", "procedimento"];

export function updateDISCFromObservations(observations: Observation[]): DISCProfile {
  const total = observations.length;
  const base = 40;

  return {
    dominance: scaleToHundred(countSignals(observations, D_SIGNALS), total, base),
    influence: scaleToHundred(countSignals(observations, I_SIGNALS), total, base),
    steadiness: scaleToHundred(countSignals(observations, S_SIGNALS), total, base),
    conscientiousness: scaleToHundred(countSignals(observations, C_SIGNALS), total, base),
  };
}

// --- Genius Zone ---

const FLOW_SIGNALS = ["perdi a noção do tempo", "flow", "hiperfoco", "absorvido", "não vi o tempo passar"];
const EXCELLENCE_SIGNALS = ["elogiaram", "destaque", "melhor em", "forte em", "minha especialidade"];
const INCOMPETENCE_SIGNALS = ["odeio", "delegar isso", "não suporto", "péssimo em", "evitar"];
const COMPETENCE_SIGNALS = ["rotina", "obrigação", "tenho que", "parte do trabalho"];

function extractTopics(observations: Observation[], signals: string[]): string[] {
  const topics: string[] = [];
  for (const obs of observations) {
    const text = extractText(obs);
    for (const signal of signals) {
      if (text.includes(signal) && obs.messageExcerpt.length > 0) {
        // Extract a short topic from the excerpt
        const excerpt = obs.messageExcerpt.slice(0, 80).trim();
        if (excerpt && !topics.includes(excerpt)) {
          topics.push(excerpt);
        }
        break;
      }
    }
  }
  return topics.slice(0, 10);
}

export function detectGeniusZone(observations: Observation[]): GeniusZoneProfile {
  const genius = extractTopics(observations, FLOW_SIGNALS);
  const excellence = extractTopics(observations, EXCELLENCE_SIGNALS);
  const competence = extractTopics(observations, COMPETENCE_SIGNALS);
  const incompetence = extractTopics(observations, INCOMPETENCE_SIGNALS);

  // Determine current zone based on most recent signals
  let currentZone: GeniusZoneProfile["currentZone"] = "competence";
  if (genius.length > 0) currentZone = "genius";
  else if (excellence.length > incompetence.length) currentZone = "excellence";
  else if (incompetence.length > excellence.length) currentZone = "incompetence";

  return { currentZone, incompetence, competence, excellence, genius };
}

// --- Report ---

export function generatePsychometricReport(profile: PsychometricProfile): string {
  const { ocean, disc, geniusZone } = profile;

  const oceanHighest = (Object.entries(ocean) as Array<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const discHighest = (Object.entries(disc) as Array<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const strengths: string[] = [];
  if (ocean.openness > 65) strengths.push("Alta criatividade e abertura a novas ideias");
  if (ocean.conscientiousness > 65) strengths.push("Forte organizacao e disciplina");
  if (disc.dominance > 65) strengths.push("Orientado a resultados");
  if (disc.influence > 65) strengths.push("Capacidade de influenciar e motivar");
  if (geniusZone.genius.length > 0) strengths.push(`Zona de genialidade identificada`);
  if (strengths.length === 0) strengths.push("Perfil equilibrado, sem extremos");

  const limiting: string[] = [];
  if (ocean.neuroticism > 65) limiting.push("Tendencia a estresse e ansiedade");
  if (ocean.agreeableness < 35) limiting.push("Dificuldade em colaboracao e delegacao");
  if (disc.steadiness < 35) limiting.push("Impaciente com processos lentos");
  if (geniusZone.incompetence.length > 0) limiting.push("Areas de incompetencia nao delegadas");
  if (limiting.length === 0) limiting.push("Nenhum padrao limitante significativo detectado");

  const lines = [
    "=== PERFIL PSICOMETRICO ===",
    "",
    "-- Big Five (OCEAN) --",
    `  Abertura: ${ocean.openness}/100`,
    `  Conscienciosidade: ${ocean.conscientiousness}/100`,
    `  Extroversao: ${ocean.extraversion}/100`,
    `  Amabilidade: ${ocean.agreeableness}/100`,
    `  Neuroticismo: ${ocean.neuroticism}/100`,
    `  Tracos dominantes: ${oceanHighest.join(", ")}`,
    "",
    "-- DISC --",
    `  Dominancia: ${disc.dominance}/100`,
    `  Influencia: ${disc.influence}/100`,
    `  Estabilidade: ${disc.steadiness}/100`,
    `  Conformidade: ${disc.conscientiousness}/100`,
    `  Perfil dominante: ${discHighest.join(", ")}`,
    "",
    "-- Zona de Genialidade --",
    `  Zona atual: ${geniusZone.currentZone}`,
    geniusZone.genius.length > 0 ? `  Genialidade: ${geniusZone.genius.join("; ")}` : "",
    geniusZone.excellence.length > 0 ? `  Excelencia: ${geniusZone.excellence.join("; ")}` : "",
    geniusZone.incompetence.length > 0 ? `  Incompetencia: ${geniusZone.incompetence.join("; ")}` : "",
    "",
    "-- Top 3 Forcas --",
    ...strengths.slice(0, 3).map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "-- Top 3 Padroes Limitantes --",
    ...limiting.slice(0, 3).map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "-- Adaptacao da Donna --",
    ocean.openness > 65
      ? "  Donna sera mais exploratoria e criativa nas sugestoes."
      : "  Donna priorizara solucoes praticas e testadas.",
    disc.dominance > 65
      ? "  Respostas diretas e orientadas a resultado."
      : "  Tom mais colaborativo e consultivo.",
    ocean.neuroticism > 55
      ? "  Donna monitorara sinais de estresse e oferecera suporte proativo."
      : "  Abordagem padrao de acompanhamento.",
    "",
    `Confianca do perfil: ${Math.round(profile.observationCount > 50 ? 85 : (profile.observationCount / 50) * 85)}%`,
    `Baseado em ${profile.observationCount} observacoes.`,
  ];

  return lines.filter((l) => l !== "").join("\n");
}

// --- Recalculate ---

export function recalculateProfile(observations: Observation[]): PsychometricProfile {
  // Apply exponential decay: recent observations weighted 2x
  const now = Date.now();
  const DECAY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000; // 7 days

  const weighted: Observation[] = [];
  for (const obs of observations) {
    const age = now - obs.timestamp;
    const weight = age < DECAY_HALF_LIFE ? 2 : 1;
    for (let i = 0; i < weight; i++) {
      weighted.push(obs);
    }
  }

  const ocean = updateOceanFromObservations(weighted);
  const disc = updateDISCFromObservations(weighted);
  const geniusZone = detectGeniusZone(weighted);

  const confidence: Record<string, number> = {};
  const minConfidence = Math.min(observations.length * 2, 100);
  for (const key of ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]) {
    confidence[key] = clamp(minConfidence, 0, 100);
  }
  for (const key of ["dominance", "influence", "steadiness", "disc_conscientiousness"]) {
    confidence[key] = clamp(minConfidence, 0, 100);
  }

  const profile: PsychometricProfile = {
    ocean,
    disc,
    geniusZone,
    confidence,
    lastUpdated: now,
    observationCount: observations.length,
    history: [{ date: now, ocean, disc }],
  };

  return profile;
}

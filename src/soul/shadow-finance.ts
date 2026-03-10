/**
 * Shadow Finance — maps emotional patterns with money.
 * Detects financial anxiety, abundance, avoidance, confidence, and scarcity signals.
 * Data stored at ~/.donna/soul/profile.json (financeProfile field).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FinanceProfile, FinancePattern } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const PROFILE_PATH = path.join(SOUL_DIR, "profile.json");
const MAX_EXAMPLES = 30;

interface ProfileFile {
  financeProfile?: FinanceProfile;
  [key: string]: unknown;
}

// --- Signal patterns per finance pattern ---

const ANXIETY_SIGNALS = [
  "preciso vender",
  "to sem caixa",
  "tou sem caixa",
  "conta no vermelho",
  "nao vai dar",
  "apertado",
  "divida",
  "parcela atrasada",
  "boleto vencido",
  "sem dinheiro",
  "nao tenho pra pagar",
];

const ABUNDANCE_SIGNALS = [
  "fechei",
  "receita boa",
  "crescendo",
  "faturamento subiu",
  "investimento",
  "lucro",
  "rendimento",
  "cliente novo",
  "bateu meta",
  "margem boa",
  "roi positivo",
];

const AVOIDANCE_SIGNALS = [
  "depois vejo isso",
  "nao e pelo dinheiro",
  "dinheiro nao importa",
  "deixa pra la o preco",
  "desconto",
  "nao quero pensar em preco",
  "me recuso a cobrar",
  "de graca",
];

const CONFIDENT_SIGNALS = [
  "vale o preco",
  "cobro x",
  "meu valor",
  "meu preco",
  "nao baixo",
  "precificacao justa",
  "vale cada centavo",
  "invisto em mim",
];

const SCARCITY_SIGNALS = [
  "caro demais",
  "nao posso",
  "economizar",
  "cortar custos",
  "muito caro",
  "nao da pra gastar",
  "gastar menos",
  "apertar o cinto",
  "sem verba",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['`]/g, "");
}

function matchSignals(text: string, signals: ReadonlyArray<string>): string[] {
  const norm = normalize(text);
  const matched: string[] = [];
  for (const signal of signals) {
    if (norm.includes(normalize(signal))) {
      matched.push(signal);
    }
  }
  return matched;
}

function createDefaultFinanceProfile(): FinanceProfile {
  return {
    dominantPattern: "mixed",
    anxietySignals: 0,
    abundanceSignals: 0,
    avoidanceSignals: 0,
    examples: [],
    lastUpdated: Date.now(),
  };
}

/** Load finance profile from ~/.donna/soul/profile.json */
export async function loadFinanceProfile(): Promise<FinanceProfile> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    const data = JSON.parse(raw) as ProfileFile;
    if (data.financeProfile) {
      return data.financeProfile;
    }
    return createDefaultFinanceProfile();
  } catch {
    return createDefaultFinanceProfile();
  }
}

/** Save finance profile to ~/.donna/soul/profile.json */
export async function saveFinanceProfile(profile: FinanceProfile): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });

  let existing: ProfileFile = {};
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    existing = JSON.parse(raw) as ProfileFile;
  } catch {
    // File doesn't exist yet, start fresh
  }

  existing.financeProfile = profile;
  await fs.writeFile(PROFILE_PATH, JSON.stringify(existing, null, 2), "utf-8");
}

/** Analyze a message for financial emotional signals. Returns null if no finance content. */
export function analyzeFinanceSignals(
  message: string,
): { pattern: FinancePattern; signals: string[] } | null {
  const anxietyMatches = matchSignals(message, ANXIETY_SIGNALS);
  const abundanceMatches = matchSignals(message, ABUNDANCE_SIGNALS);
  const avoidanceMatches = matchSignals(message, AVOIDANCE_SIGNALS);
  const confidentMatches = matchSignals(message, CONFIDENT_SIGNALS);
  const scarcityMatches = matchSignals(message, SCARCITY_SIGNALS);

  const allSignals = [
    ...anxietyMatches,
    ...abundanceMatches,
    ...avoidanceMatches,
    ...confidentMatches,
    ...scarcityMatches,
  ];

  if (allSignals.length === 0) return null;

  // Determine dominant pattern from this message
  const counts: Array<[FinancePattern, number]> = [
    ["anxiety", anxietyMatches.length],
    ["abundance", abundanceMatches.length],
    ["avoidance", avoidanceMatches.length],
    ["confident", confidentMatches.length],
    ["scarcity", scarcityMatches.length],
  ];

  counts.sort((a, b) => b[1] - a[1]);
  const pattern: FinancePattern = counts[0][1] > 0 ? counts[0][0] : "mixed";

  return { pattern, signals: allSignals };
}

/** Update finance profile with signals from a new message. */
export function updateFinanceProfile(profile: FinanceProfile, message: string): FinanceProfile {
  const result = analyzeFinanceSignals(message);
  if (!result) return profile;

  const updated = { ...profile };
  const now = Date.now();

  // Update counters based on detected pattern
  if (result.pattern === "anxiety") updated.anxietySignals += result.signals.length;
  if (result.pattern === "abundance") updated.abundanceSignals += result.signals.length;
  if (result.pattern === "avoidance") updated.avoidanceSignals += result.signals.length;

  // Add examples (cap at MAX_EXAMPLES)
  const excerpt = message.length > 120 ? message.slice(0, 117) + "..." : message;
  const examples = [
    ...updated.examples,
    { text: excerpt, pattern: result.pattern, date: now },
  ];
  updated.examples = examples.length > MAX_EXAMPLES ? examples.slice(examples.length - MAX_EXAMPLES) : examples;

  // Recalculate dominant pattern
  const patternCounts: Array<[FinancePattern, number]> = [
    ["anxiety", updated.anxietySignals],
    ["abundance", updated.abundanceSignals],
    ["avoidance", updated.avoidanceSignals],
  ];
  patternCounts.sort((a, b) => b[1] - a[1]);

  if (patternCounts[0][1] === 0) {
    updated.dominantPattern = "mixed";
  } else if (patternCounts[0][1] === patternCounts[1]?.[1]) {
    updated.dominantPattern = "mixed";
  } else {
    updated.dominantPattern = patternCounts[0][0];
  }

  updated.lastUpdated = now;
  return updated;
}

// --- Book recommendations per pattern ---

const PATTERN_BOOK_RECS: Record<FinancePattern, string> = {
  anxiety: '"A Psicologia Financeira" de Morgan Housel — entenda por que medo domina suas decisoes financeiras.',
  scarcity: '"A Psicologia Financeira" de Morgan Housel — a mentalidade de escassez te impede de ver oportunidades.',
  avoidance: '"Pai Rico, Pai Pobre" de Robert Kiyosaki — evitar dinheiro nao e virtude, e medo disfarçado.',
  abundance: '"O Investidor Inteligente" de Benjamin Graham — abundancia precisa de disciplina para durar.',
  confident: '"Antifrágil" de Nassim Taleb — confianca e otima, mas construa sistemas que ganham com volatilidade.',
  mixed: '"A Psicologia Financeira" de Morgan Housel — entenda seu proprio padrao emocional com dinheiro.',
};

const PATTERN_INSIGHTS: Record<FinancePattern, string> = {
  anxiety: "Ansiedade financeira raramente e sobre dinheiro — e sobre controle. Foque no que voce controla.",
  scarcity: "Mentalidade de escassez te faz cortar custos quando deveria investir. Pare e recalcule.",
  avoidance: "Evitar falar de dinheiro nao faz o problema sumir. O primeiro passo e olhar os numeros.",
  abundance: "Voce esta num ciclo positivo. Aproveite para construir reservas e sistemas que protegem esse momentum.",
  confident: "Confianca com dinheiro e rara. Continue precificando pelo valor que entrega, nao pelo medo de perder.",
  mixed: "Seu padrao financeiro ainda esta se formando. Continue e a Donna vai refinar a analise.",
};

/** Generate a Portuguese report about the user's financial emotional profile. */
export function generateFinanceReport(profile: FinanceProfile): string {
  const { dominantPattern, examples } = profile;

  const lines: string[] = ["== Relatorio Financeiro Emocional ==", ""];

  lines.push(`Seu padrao financeiro dominante e: ${dominantPattern.toUpperCase()}`);
  lines.push("");

  // Show real examples
  if (examples.length > 0) {
    const recentExamples = examples.slice(-5);
    lines.push("Isso se manifesta quando:");
    for (const ex of recentExamples) {
      const date = new Date(ex.date).toLocaleDateString("pt-BR");
      lines.push(`  - [${date}] "${ex.text}" (padrao: ${ex.pattern})`);
    }
    lines.push("");
  }

  lines.push(`Livro recomendado: ${PATTERN_BOOK_RECS[dominantPattern]}`);
  lines.push("");
  lines.push(`Insight: ${PATTERN_INSIGHTS[dominantPattern]}`);
  lines.push("");

  // Stats
  lines.push("--- Sinais detectados ---");
  lines.push(`  Ansiedade: ${profile.anxietySignals}`);
  lines.push(`  Abundancia: ${profile.abundanceSignals}`);
  lines.push(`  Evitacao: ${profile.avoidanceSignals}`);
  lines.push(`  Total de exemplos: ${examples.length}`);

  return lines.join("\n");
}

import type {
  VoiceSnapshot,
  EnergyLevel,
  MoodState,
  CommunicationStyle,
  UrgencyLevel,
} from "./types.js";

const DEPLETED_SIGNALS = ["cansado", "exausto", "dormi mal", "dor de cabeca", "dor de cabeça", "sem energia"];
const HIGH_ENERGY_SIGNALS = ["vamos", "bora", "animado", "empolgado"];

const FOCUSED_SIGNALS = ["preciso focar", "concentrar"];
const ANXIOUS_SIGNALS = ["não sei", "e se", "será que"];
const EXCITED_SIGNALS = ["incrível", "consegui", "fechei"];
const FRUSTRATED_SIGNALS = ["droga", "merda", "pqp", "não funciona", "de novo"];
const REFLECTIVE_SIGNALS = ["pensando em", "refletindo", "será que"];
const RUSHED_INDICATORS = ["faz", "roda", "manda", "envia"];

const URGENCY_WORDS = ["urgente", "deadline", "prazo", "agora"];
const CRISIS_WORDS = ["emergência", "caiu", "fora do ar", "perdendo dinheiro", "desastre", "fodeu"];
const POSITIVE_WORDS = ["ótimo", "tranquilo", "suave", "beleza", "top"];

const ANALYTICAL_SIGNALS = ["dados", "métricas", "análise", "performance", "benchmark", "query", "schema"];
const ASSERTIVE_SIGNALS = ["faça", "preciso", "quero", "agora", "muda", "troca"];
const PASSIVE_SIGNALS = ["por favor", "será que poderia", "se possível", "quando puder", "talvez"];
const CREATIVE_SIGNALS = ["e se", "imagina", "seria legal", "brainstorm", "ideia"];

const ELEVATED_URGENCY_WORDS = ["urgente", "agora", "rápido", "preciso já", "deadline hoje"];
const CRISIS_URGENCY_WORDS = ["emergência", "caiu", "fora do ar", "perdendo dinheiro"];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const p of patterns) {
    if (lower.includes(p)) count++;
  }
  return count;
}

function hasPattern(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasExclamations(text: string): boolean {
  return (text.match(/!+/g) ?? []).length >= 2;
}

function hasCaps(text: string): boolean {
  const words = text.split(/\s+/);
  const capsWords = words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  return capsWords.length >= 2;
}

function hasEmojis(text: string): boolean {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
}

function hasRepeatedChars(text: string): boolean {
  return /(.)\1{2,}/i.test(text);
}

function hasMultipleQuestions(text: string): boolean {
  return (text.match(/\?/g) ?? []).length >= 2;
}

function detectEnergy(text: string, words: number): EnergyLevel {
  if (hasPattern(text, DEPLETED_SIGNALS)) return "depleted";
  if (hasPattern(text, HIGH_ENERGY_SIGNALS)) return "high";
  if (hasExclamations(text) || hasCaps(text)) return "high";
  if (words < 15 && !/[.!?]/.test(text)) return "low";
  if (words > 40) return "medium";
  return "medium";
}

function detectMood(text: string, words: number): MoodState {
  if (hasPattern(text, FRUSTRATED_SIGNALS)) return "frustrated";
  if (hasPattern(text, EXCITED_SIGNALS) || hasExclamations(text)) return "excited";
  if (hasPattern(text, ANXIOUS_SIGNALS) || hasMultipleQuestions(text)) return "anxious";
  if (hasPattern(text, FOCUSED_SIGNALS) || (words > 50 && countMatches(text, ANALYTICAL_SIGNALS) > 0)) return "focused";
  if (hasPattern(text, REFLECTIVE_SIGNALS) || (hasMultipleQuestions(text) && words > 30)) return "reflective";
  // Rushed: short imperative without greetings
  const greetings = ["oi", "olá", "bom dia", "boa tarde", "boa noite", "hey", "eae"];
  if (words < 8 && !hasPattern(text, greetings) && hasPattern(text, RUSHED_INDICATORS)) return "rushed";
  return "neutral";
}

function detectStress(text: string): number {
  let stress = 3;
  stress += countMatches(text, URGENCY_WORDS);
  if (hasRepeatedChars(text)) stress += 1;
  stress += countMatches(text, CRISIS_WORDS) * 2;
  stress -= Math.min(countMatches(text, POSITIVE_WORDS), 2);
  if (hasEmojis(text)) stress -= 1;
  return Math.max(0, Math.min(10, stress));
}

function detectCommunicationStyle(text: string): CommunicationStyle {
  const scores: Record<CommunicationStyle, number> = {
    analytical: countMatches(text, ANALYTICAL_SIGNALS),
    assertive: countMatches(text, ASSERTIVE_SIGNALS),
    passive: countMatches(text, PASSIVE_SIGNALS),
    creative: countMatches(text, CREATIVE_SIGNALS),
  };
  let best: CommunicationStyle = "analytical";
  let max = 0;
  for (const [style, score] of Object.entries(scores) as Array<[CommunicationStyle, number]>) {
    if (score > max) {
      max = score;
      best = style;
    }
  }
  return max > 0 ? best : "analytical";
}

function detectUrgency(text: string): UrgencyLevel {
  if (hasPattern(text, CRISIS_URGENCY_WORDS)) return "crisis";
  if (hasPattern(text, ELEVATED_URGENCY_WORDS)) return "elevated";
  return "normal";
}

function collectSignals(text: string): string[] {
  const signals: string[] = [];
  const allPatterns: Array<[string[], string]> = [
    [DEPLETED_SIGNALS, "depleted-energy"],
    [HIGH_ENERGY_SIGNALS, "high-energy"],
    [FRUSTRATED_SIGNALS, "frustration"],
    [EXCITED_SIGNALS, "excitement"],
    [ANXIOUS_SIGNALS, "anxiety"],
    [FOCUSED_SIGNALS, "focus"],
    [CRISIS_WORDS, "crisis"],
    [URGENCY_WORDS, "urgency"],
    [POSITIVE_WORDS, "positive"],
    [CREATIVE_SIGNALS, "creative"],
  ];
  for (const [patterns, label] of allPatterns) {
    if (hasPattern(text, patterns)) signals.push(label);
  }
  if (hasExclamations(text)) signals.push("exclamations");
  if (hasCaps(text)) signals.push("caps");
  if (hasEmojis(text)) signals.push("emojis");
  if (hasMultipleQuestions(text)) signals.push("multiple-questions");
  return signals;
}

/** Analyze a message and produce a VoiceSnapshot. */
export function analyzeVoice(message: string): VoiceSnapshot {
  const words = wordCount(message);
  const energy = detectEnergy(message, words);
  const mood = detectMood(message, words);
  const stressLevel = detectStress(message);
  const communicationStyle = detectCommunicationStyle(message);
  const urgency = detectUrgency(message);
  const signals = collectSignals(message);

  return {
    timestamp: Date.now(),
    energy,
    mood,
    stressLevel,
    communicationStyle,
    urgency,
    signals,
    messageLength: message.length,
    wordCount: words,
  };
}

/** Returns a concise adaptation hint for Donna's response style. */
export function generateAdaptationHint(snapshot: VoiceSnapshot): string {
  if (snapshot.energy === "depleted") {
    return "Respostas curtas. Nao empilhe tarefas. Ofereca 1 acao so.";
  }
  if (snapshot.urgency === "crisis") {
    return "Modo emergencia. Resolva o problema imediatamente. Zero conversa fiada.";
  }
  if (snapshot.stressLevel >= 7) {
    return "Seja direto e objetivo. Resolva o problema primeiro.";
  }
  if (snapshot.mood === "frustrated") {
    return "Reconheca a frustracao brevemente. Ofereca solucao concreta.";
  }
  if (snapshot.mood === "anxious") {
    return "Transmita calma. Quebre em passos simples. Valide preocupacoes.";
  }
  if (snapshot.mood === "excited") {
    return "Acompanhe a energia. Celebre junto. Aproveite o momentum.";
  }
  if (snapshot.communicationStyle === "creative") {
    return "Explore possibilidades. Seja expansivo.";
  }
  if (snapshot.mood === "reflective") {
    return "Faca perguntas profundas. De espaco para pensar.";
  }
  if (snapshot.mood === "rushed") {
    return "Responda rapido e direto. Sem introducoes longas.";
  }
  if (snapshot.communicationStyle === "assertive") {
    return "Responda no mesmo tom direto. Sem rodeios.";
  }
  if (snapshot.communicationStyle === "passive") {
    return "Seja gentil mas proativo. Sugira opcoes claras.";
  }
  return "Tom equilibrado. Adapte conforme a conversa evolui.";
}

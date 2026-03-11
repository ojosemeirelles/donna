import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DetectedPattern, PatternType, Observation } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const PROFILE_PATH = path.join(SOUL_DIR, "profile.json");

type ProfileData = {
  patterns?: DetectedPattern[];
  [key: string]: unknown;
};

export async function loadPatterns(): Promise<DetectedPattern[]> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    const data = JSON.parse(raw) as ProfileData;
    return data.patterns ?? [];
  } catch {
    return [];
  }
}

export async function savePatterns(patterns: DetectedPattern[]): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
  let data: ProfileData = {};
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    data = JSON.parse(raw) as ProfileData;
  } catch {
    // file doesn't exist yet
  }
  data.patterns = patterns;
  await fs.writeFile(PROFILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function extractSubject(obs: Observation): string {
  const excerpt = obs.messageExcerpt.toLowerCase();
  // Use first meaningful phrase (up to 60 chars) as subject identifier
  const trimmed = excerpt.replace(/[^\w\sàáâãéêíóôõúç]/gi, "").trim();
  return trimmed.slice(0, 60);
}

function severity(count: number): DetectedPattern["severity"] {
  if (count >= 7) {
    return "significant";
  }
  if (count >= 5) {
    return "moderate";
  }
  return "mild";
}

function groupBySubject(observations: Observation[]): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>();
  for (const obs of observations) {
    const subject = extractSubject(obs);
    if (!subject) {
      continue;
    }
    const existing = groups.get(subject);
    if (existing) {
      existing.push(obs);
    } else {
      groups.set(subject, [obs]);
    }
  }
  return groups;
}

export function detectProcrastination(observations: Observation[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const groups = groupBySubject(observations);

  for (const [subject, entries] of groups) {
    if (entries.length < 3) {
      continue;
    }

    // Check if any entry signals completion
    const doneSignals = ["feito", "pronto", "concluido", "terminei", "done", "finalizado"];
    const hasDone = entries.some((e) =>
      doneSignals.some((s) => e.messageExcerpt.toLowerCase().includes(s)),
    );

    if (!hasDone) {
      const sorted = entries.toSorted((a, b) => a.timestamp - b.timestamp);
      patterns.push({
        type: "procrastination",
        subject,
        firstDetected: sorted[0].timestamp,
        lastSeen: sorted[sorted.length - 1].timestamp,
        occurrences: entries.length,
        examples: entries.slice(0, 3).map((e) => e.messageExcerpt),
        severity: severity(entries.length),
        addressed: false,
      });
    }
  }

  return patterns;
}

export function detectAvoidance(observations: Observation[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const deflectionSignals = [
    "depois vejo",
    "deixa pra la",
    "nao quero falar",
    "muda de assunto",
    "tanto faz",
    "sei la",
    "esquece",
    "nao importa",
  ];
  const groups = groupBySubject(observations);

  for (const [subject, entries] of groups) {
    if (entries.length < 2) {
      continue;
    }

    const deflected = entries.filter((e) =>
      deflectionSignals.some((s) => e.messageExcerpt.toLowerCase().includes(s)),
    );

    if (deflected.length >= 2) {
      const sorted = entries.toSorted((a, b) => a.timestamp - b.timestamp);
      patterns.push({
        type: "avoidance",
        subject,
        firstDetected: sorted[0].timestamp,
        lastSeen: sorted[sorted.length - 1].timestamp,
        occurrences: deflected.length,
        examples: deflected.slice(0, 3).map((e) => e.messageExcerpt),
        severity: severity(deflected.length),
        addressed: false,
      });
    }
  }

  return patterns;
}

export function detectStressLoop(observations: Observation[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const recent = observations.filter((o) => o.timestamp >= tenDaysAgo);

  const stressObs = recent.filter((o) => {
    const data = o.data;
    return (typeof data.stressLevel === "number" && data.stressLevel >= 6) || o.type === "pattern";
  });

  const groups = groupBySubject(stressObs);

  for (const [subject, entries] of groups) {
    if (entries.length < 5) {
      continue;
    }

    const sorted = entries.toSorted((a, b) => a.timestamp - b.timestamp);
    patterns.push({
      type: "stress_loop",
      subject,
      firstDetected: sorted[0].timestamp,
      lastSeen: sorted[sorted.length - 1].timestamp,
      occurrences: entries.length,
      examples: entries.slice(0, 3).map((e) => e.messageExcerpt),
      severity: severity(entries.length),
      addressed: false,
    });
  }

  return patterns;
}

export function detectDecisionBias(observations: Observation[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const perfectionismSignals = [
    "nao esta bom o suficiente",
    "preciso melhorar",
    "refazer",
    "mais uma vez",
    "ainda nao",
    "falta algo",
  ];
  const paralysisSignals = [
    "preciso pensar mais",
    "vou pesquisar",
    "nao sei decidir",
    "preciso de mais dados",
    "vou analisar",
  ];
  const impulsivitySignals = [
    "me arrependi",
    "nao devia ter",
    "fiz sem pensar",
    "precipitei",
    "devia ter pensado",
    "erro meu",
  ];

  const biasChecks: Array<{ type: PatternType; signals: string[] }> = [
    { type: "perfectionism", signals: perfectionismSignals },
    { type: "analysis_paralysis", signals: paralysisSignals },
    { type: "impulsivity", signals: impulsivitySignals },
  ];

  for (const check of biasChecks) {
    const matches = observations.filter((o) =>
      check.signals.some((s) => o.messageExcerpt.toLowerCase().includes(s)),
    );

    if (matches.length >= 3) {
      const sorted = matches.toSorted((a, b) => a.timestamp - b.timestamp);
      patterns.push({
        type: check.type,
        subject: `padrao de ${check.type.replace("_", " ")}`,
        firstDetected: sorted[0].timestamp,
        lastSeen: sorted[sorted.length - 1].timestamp,
        occurrences: matches.length,
        examples: matches.slice(0, 3).map((e) => e.messageExcerpt),
        severity: severity(matches.length),
        addressed: false,
      });
    }
  }

  return patterns;
}

export function analyzePatterns(observations: Observation[]): DetectedPattern[] {
  const detected = [
    ...detectProcrastination(observations),
    ...detectAvoidance(observations),
    ...detectStressLoop(observations),
    ...detectDecisionBias(observations),
  ];

  // Merge with logic: if same type+subject exists, update occurrences and lastSeen
  const merged = new Map<string, DetectedPattern>();
  for (const pattern of detected) {
    const key = `${pattern.type}::${pattern.subject}`;
    const existing = merged.get(key);
    if (existing) {
      existing.occurrences = Math.max(existing.occurrences, pattern.occurrences);
      existing.lastSeen = Math.max(existing.lastSeen, pattern.lastSeen);
      existing.severity = severity(existing.occurrences);
      // Append unique examples up to 5
      for (const ex of pattern.examples) {
        if (!existing.examples.includes(ex) && existing.examples.length < 5) {
          existing.examples.push(ex);
        }
      }
    } else {
      merged.set(key, { ...pattern });
    }
  }

  return [...merged.values()];
}

function daysAgo(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

export function formatPatternReport(patterns: DetectedPattern[]): string {
  if (patterns.length === 0) {
    return "Nenhum padrao comportamental detectado ainda.";
  }

  const lines: string[] = [];
  lines.push("=== Padroes Comportamentais ===\n");

  // Sort by severity: significant > moderate > mild
  const severityOrder: Record<string, number> = { significant: 0, moderate: 1, mild: 2 };
  const sorted = [...patterns]
    .filter((p) => !p.addressed)
    .toSorted((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (sorted.length === 0) {
    lines.push("Todos os padroes detectados ja foram endereados.");
    return lines.join("\n");
  }

  for (const pattern of sorted) {
    const typeLabels: Record<PatternType, string> = {
      procrastination: "Procrastinacao",
      avoidance: "Evitacao",
      perfectionism: "Perfeccionismo",
      analysis_paralysis: "Paralisia de Analise",
      impulsivity: "Impulsividade",
      stress_loop: "Loop de Estresse",
      overcommitment: "Excesso de Compromissos",
    };

    const severityLabels: Record<string, string> = {
      mild: "Leve",
      moderate: "Moderado",
      significant: "Significativo",
    };

    lines.push(`[${severityLabels[pattern.severity]}] ${typeLabels[pattern.type]}`);
    lines.push(`  Parece que "${pattern.subject}" aparece com frequencia.`);
    lines.push(
      `  Detectado ha ${daysAgo(pattern.firstDetected)} dias, visto ${pattern.occurrences} vezes.`,
    );

    if (pattern.examples.length > 0) {
      lines.push("  Exemplos:");
      for (const ex of pattern.examples.slice(0, 2)) {
        lines.push(`    - "${ex.slice(0, 80)}"`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function getPatternAlerts(patterns: DetectedPattern[]): string[] {
  const alerts: string[] = [];

  const significant = patterns
    .filter((p) => !p.addressed && (p.severity === "significant" || p.severity === "moderate"))
    .toSorted((a, b) => b.occurrences - a.occurrences);

  for (const pattern of significant.slice(0, 2)) {
    switch (pattern.type) {
      case "procrastination":
        alerts.push(
          `Parece que "${pattern.subject}" continua pendente. Quer que eu te ajude a quebrar em passos menores?`,
        );
        break;
      case "avoidance":
        alerts.push(
          `Voce tem evitado "${pattern.subject}" ha um tempo. Quando quiser falar sobre isso, estou aqui.`,
        );
        break;
      case "stress_loop":
        alerts.push(
          `"${pattern.subject}" esta gerando estresse recorrente. Talvez seja hora de resolver de vez.`,
        );
        break;
      case "perfectionism":
        alerts.push(
          `Parece que o perfeccionismo esta atrasando suas entregas. "Feito" e melhor que "perfeito"?`,
        );
        break;
      case "analysis_paralysis":
        alerts.push(`Voce esta analisando demais. Que tal definir um prazo para decidir?`);
        break;
      case "impulsivity":
        alerts.push(
          `Algumas decisoes recentes geraram arrependimento. Quer criar uma regra de "esperar 24h"?`,
        );
        break;
      default:
        alerts.push(`Padrao detectado em "${pattern.subject}". Quer conversar sobre isso?`);
    }
  }

  return alerts;
}

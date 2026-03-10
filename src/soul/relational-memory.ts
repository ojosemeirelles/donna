/**
 * Relational Memory — tracks people mentioned in conversations.
 * Data stored at ~/.donna/soul/relationships.json
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Person, RelationshipMap, RelationshipType, Sentiment } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");
const RELATIONSHIPS_PATH = path.join(SOUL_DIR, "relationships.json");

// 7 days in ms
const ATTENTION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
// 2 days in ms
const UPCOMING_DATE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
// 3 days in ms
const CONFLICT_FOLLOWUP_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_NOTES = 20;

const CLOSE_RELATIONSHIPS: ReadonlySet<RelationshipType> = new Set([
  "family",
  "partner",
  "friend",
  "business_partner",
]);

const RELATIONSHIP_KEYWORDS: ReadonlyArray<{ pattern: RegExp; type: RelationshipType }> = [
  { pattern: /\b(?:m[ai]e|pai|irm[aã]o|irm[aã]|filho|filha|av[oó]|av[oó])\b/i, type: "family" },
  { pattern: /\b(?:s[oó]cio|parceiro de neg[oó]cio)\b/i, type: "business_partner" },
  { pattern: /\bcliente\b/i, type: "client" },
  { pattern: /\b(?:amigo|amiga)\b/i, type: "friend" },
  { pattern: /\b(?:chefe|gestor|l[ií]der)\b/i, type: "colleague" },
  { pattern: /\b(?:namorad[oa]|esposa?o?|marido|companheira?o?)\b/i, type: "partner" },
  { pattern: /\bmentor(?:a)?\b/i, type: "mentor" },
];

const NAME_PATTERNS: ReadonlyArray<RegExp> = [
  // "minha mae Maria", "meu pai João", "meu sócio Pedro"
  /\b(?:minha?|meu)\s+(?:m[aã]e|pai|irm[aã]o|irm[aã]|filho|filha|s[oó]cio|amigo|amiga|chefe|namorad[oa]|esposa?o?|marido|mentor(?:a)?|parceiro)\s+([A-Z][a-záàãéêíóôúç]+(?:\s+[A-Z][a-záàãéêíóôúç]+)?)/g,
  // "o João", "a Maria" (article + capitalized name)
  /\b(?:o|a)\s+([A-Z][a-záàãéêíóôúç]+)/g,
  // "minha mae", "meu pai" (without name — we still capture the relationship)
  /\b(?:minha?|meu)\s+(m[aã]e|pai|irm[aã]o|irm[aã]|filho|filha|s[oó]cio|amigo|amiga|chefe|namorad[oa]|esposa?o?|marido)\b/gi,
];

const POSITIVE_WORDS = /\b(?:amo|incr[ií]vel|adoro|orgulho|feliz\s+com|maravilhos[oa]|excelente)\b/i;
const TENSION_WORDS = /\b(?:discuss[aã]o|desentendimento|irritad[oa]\s+com|problema\s+com|chateado)\b/i;
const CONFLICT_WORDS = /\b(?:briga|rompimento|terminei|n[aã]o\s+falo\s+mais|separei|cortei)\b/i;

export async function loadRelationships(): Promise<RelationshipMap> {
  try {
    const raw = await fs.readFile(RELATIONSHIPS_PATH, "utf-8");
    return JSON.parse(raw) as RelationshipMap;
  } catch {
    return { people: [], lastUpdated: 0 };
  }
}

export async function saveRelationships(map: RelationshipMap): Promise<void> {
  await fs.mkdir(SOUL_DIR, { recursive: true });
  await fs.writeFile(RELATIONSHIPS_PATH, JSON.stringify(map, null, 2), "utf-8");
}

export function extractPeople(message: string): Array<{ name: string; context: string }> {
  const results: Array<{ name: string; context: string }> = [];
  const seen = new Set<string>();

  for (const pattern of NAME_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(message)) !== null) {
      const name = match[1]?.trim();
      if (!name) { continue; }
      const lower = name.toLowerCase();
      if (seen.has(lower)) { continue; }
      seen.add(lower);

      // Extract surrounding context (up to 80 chars around the match)
      const start = Math.max(0, match.index - 40);
      const end = Math.min(message.length, match.index + match[0].length + 40);
      const context = message.slice(start, end).trim();

      results.push({ name, context });
    }
  }

  return results;
}

export function detectSentiment(context: string): Sentiment {
  if (CONFLICT_WORDS.test(context)) { return "conflict"; }
  if (TENSION_WORDS.test(context)) { return "tension"; }
  if (POSITIVE_WORDS.test(context)) { return "positive"; }
  return "neutral";
}

function inferRelationshipType(context: string): RelationshipType {
  for (const { pattern, type } of RELATIONSHIP_KEYWORDS) {
    if (pattern.test(context)) { return type; }
  }
  return "other";
}

export function updateRelationship(
  map: RelationshipMap,
  name: string,
  relationship: RelationshipType,
  sentiment: Sentiment,
  context: string,
): RelationshipMap {
  const now = Date.now();
  const people = [...map.people];
  const idx = people.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());

  if (idx >= 0) {
    const existing = { ...people[idx] };
    existing.mentionCount += 1;
    existing.lastMentioned = now;
    existing.sentiment = sentiment;
    // Only upgrade relationship type if it was "other"
    if (existing.relationship === "other" && relationship !== "other") {
      existing.relationship = relationship;
    }
    const notes = [...existing.notes, context];
    existing.notes = notes.length > MAX_NOTES ? notes.slice(notes.length - MAX_NOTES) : notes;
    people[idx] = existing;
  } else {
    people.push({
      name,
      relationship,
      firstMentioned: now,
      lastMentioned: now,
      mentionCount: 1,
      sentiment,
      importantDates: [],
      notes: [context],
    });
  }

  return { people, lastUpdated: now };
}

export function getRelationshipAlerts(map: RelationshipMap): string[] {
  const now = Date.now();
  const alerts: string[] = [];

  for (const person of map.people) {
    // Close relationships not mentioned in 7+ days
    if (
      CLOSE_RELATIONSHIPS.has(person.relationship) &&
      now - person.lastMentioned > ATTENTION_THRESHOLD_MS
    ) {
      const days = Math.floor((now - person.lastMentioned) / (24 * 60 * 60 * 1000));
      alerts.push(`${person.name} nao foi mencionado(a) ha ${days} dias.`);
    }

    // Upcoming important dates (within 2 days)
    for (const d of person.importantDates) {
      const dateThisYear = parseDateThisYear(d.date);
      if (dateThisYear !== null) {
        const diff = dateThisYear - now;
        if (diff >= 0 && diff <= UPCOMING_DATE_THRESHOLD_MS) {
          const daysUntil = Math.ceil(diff / (24 * 60 * 60 * 1000));
          alerts.push(
            daysUntil === 0
              ? `Hoje e ${d.label} de ${person.name}!`
              : `${d.label} de ${person.name} em ${daysUntil} dia(s).`,
          );
        }
      }
    }

    // Conflict follow-up after 3 days
    if (
      person.sentiment === "conflict" &&
      now - person.lastMentioned > CONFLICT_FOLLOWUP_MS
    ) {
      alerts.push(
        `Houve um conflito com ${person.name} recentemente. Talvez valha um follow-up.`,
      );
    }
  }

  return alerts;
}

export function formatRelationshipReport(map: RelationshipMap): string {
  if (map.people.length === 0) { return "Nenhum relacionamento registrado ainda."; }

  const groups = new Map<RelationshipType, Person[]>();
  for (const person of map.people) {
    const list = groups.get(person.relationship) ?? [];
    list.push(person);
    groups.set(person.relationship, list);
  }

  const typeLabels: Record<RelationshipType, string> = {
    family: "Familia",
    partner: "Parceiro(a)",
    friend: "Amigos",
    colleague: "Colegas",
    client: "Clientes",
    mentor: "Mentores",
    business_partner: "Socios",
    other: "Outros",
  };

  const sentimentLabel: Record<Sentiment, string> = {
    positive: "positivo",
    neutral: "neutro",
    tension: "tensao",
    conflict: "conflito",
  };

  const lines: string[] = ["== Relatorio de Relacionamentos ==", ""];

  for (const [type, people] of groups) {
    lines.push(`--- ${typeLabels[type]} ---`);
    for (const p of people) {
      const lastContact = new Date(p.lastMentioned).toLocaleDateString("pt-BR");
      lines.push(
        `  ${p.name}: ${p.mentionCount} mencoes | Ultimo contato: ${lastContact} | Sentimento: ${sentimentLabel[p.sentiment]}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function getMorningBriefRelationships(map: RelationshipMap): string | null {
  const alerts = getRelationshipAlerts(map);
  if (alerts.length === 0) { return null; }
  return ["Relacionamentos:", ...alerts.map((a) => `  - ${a}`)].join("\n");
}

/**
 * Processes a message: extracts people, detects sentiment, updates the map.
 * Convenience function combining extractPeople + inferRelationshipType + detectSentiment + updateRelationship.
 */
export function processMessage(map: RelationshipMap, message: string): RelationshipMap {
  const people = extractPeople(message);
  let updated = { ...map };
  for (const { name, context } of people) {
    const rel = inferRelationshipType(context);
    const sentiment = detectSentiment(context);
    updated = updateRelationship(updated, name, rel, sentiment, context);
  }
  return updated;
}

// --- Internal helpers ---

function parseDateThisYear(dateStr: string): number | null {
  // Expected format: "MM-DD" or "YYYY-MM-DD"
  try {
    const now = new Date();
    const parts = dateStr.split("-");
    if (parts.length === 2) {
      const month = Number.parseInt(parts[0], 10) - 1;
      const day = Number.parseInt(parts[1], 10);
      return new Date(now.getFullYear(), month, day).getTime();
    }
    if (parts.length === 3) {
      const month = Number.parseInt(parts[1], 10) - 1;
      const day = Number.parseInt(parts[2], 10);
      return new Date(now.getFullYear(), month, day).getTime();
    }
    return null;
  } catch {
    return null;
  }
}

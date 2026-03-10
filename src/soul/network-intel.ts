import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RelationshipHealth, RelationshipCategory, Person } from "./types.js";

const SOUL_DIR = path.join(os.homedir(), ".donna", "soul");

const RELATIONSHIP_TO_CATEGORY: Record<Person["relationship"], RelationshipCategory> = {
  family: "family",
  partner: "partners",
  friend: "friends",
  colleague: "team",
  client: "clients",
  mentor: "mentors",
  business_partner: "team",
  other: "friends",
};

function groupByCategory(people: Person[]): Map<RelationshipCategory, Person[]> {
  const groups = new Map<RelationshipCategory, Person[]>();
  for (const person of people) {
    const category = RELATIONSHIP_TO_CATEGORY[person.relationship];
    const list = groups.get(category);
    if (list) {
      list.push(person);
    } else {
      groups.set(category, [person]);
    }
  }
  return groups;
}

export function analyzeNetworkHealth(people: Person[]): RelationshipHealth[] {
  const groups = groupByCategory(people);
  const results: RelationshipHealth[] = [];

  for (const [category, members] of groups) {
    let positive = 0;
    let negative = 0;
    let latestContact = 0;

    for (const person of members) {
      if (person.sentiment === "positive" || person.sentiment === "neutral") {
        positive += person.mentionCount;
      } else {
        negative += person.mentionCount;
      }
      if (person.lastMentioned > latestContact) {
        latestContact = person.lastMentioned;
      }
    }

    const total = positive + negative;
    const healthScore = total > 0 ? Math.round((positive / total) * 10 * 10) / 10 : 5;

    // Key people: top 3 by mention count
    const sortedByMentions = [...members].sort((a, b) => b.mentionCount - a.mentionCount);
    const keyPeople = sortedByMentions.slice(0, 3).map((p) => p.name);

    results.push({
      category,
      positiveMentions: positive,
      negativeMentions: negative,
      healthScore: Math.min(10, healthScore),
      lastContact: latestContact,
      keyPeople,
    });
  }

  return results;
}

export function getHealthyRelationships(health: RelationshipHealth[]): RelationshipCategory[] {
  return health.filter((h) => h.healthScore >= 7).map((h) => h.category);
}

export function getNeedsAttention(health: RelationshipHealth[]): RelationshipCategory[] {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return health
    .filter((h) => h.healthScore < 5 || h.lastContact < fourteenDaysAgo)
    .map((h) => h.category);
}

export function getAvoidedPeople(people: Person[]): string[] {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const avoided: string[] = [];

  for (const person of people) {
    // No recent mentions but was previously mentioned frequently
    const noRecentContact = person.lastMentioned < thirtyDaysAgo;
    const wasPreviouslyActive = person.mentionCount >= 3;

    if (noRecentContact && wasPreviouslyActive) {
      avoided.push(person.name);
      continue;
    }

    // Sentiment deteriorated from positive to tension/conflict
    if (
      (person.sentiment === "tension" || person.sentiment === "conflict") &&
      person.mentionCount >= 2
    ) {
      avoided.push(person.name);
    }
  }

  return avoided;
}

const CATEGORY_LABELS: Record<RelationshipCategory, string> = {
  family: "Familia",
  partners: "Parceiros",
  clients: "Clientes",
  mentors: "Mentores",
  friends: "Amigos",
  team: "Equipe",
};

function healthIndicator(score: number): string {
  if (score >= 8) return "[+++]";
  if (score >= 6) return "[++ ]";
  if (score >= 4) return "[+  ]";
  if (score >= 2) return "[-  ]";
  return "[-- ]";
}

export function generateMonthlyInsight(people: Person[], health: RelationshipHealth[]): string {
  const lines: string[] = [];
  lines.push("=== Insight Mensal de Relacionamentos ===\n");

  const healthy = getHealthyRelationships(health);
  if (healthy.length > 0) {
    const labels = healthy.map((c) => CATEGORY_LABELS[c]).join(", ");
    lines.push(`Suas relacoes mais saudaveis este mes: ${labels}`);
  } else {
    lines.push("Nenhuma categoria de relacionamento esta com saude alta este mes.");
  }

  const attention = getNeedsAttention(health);
  if (attention.length > 0) {
    const labels = attention.map((c) => CATEGORY_LABELS[c]).join(", ");
    lines.push(`Relacoes que precisam de atencao: ${labels}`);
  }

  const avoided = getAvoidedPeople(people);
  if (avoided.length > 0) {
    lines.push(`Pessoa que voce mais evitou mencionar: ${avoided[0]}`);
    if (avoided.length > 1) {
      lines.push(`Outras pessoas sem contato recente: ${avoided.slice(1, 4).join(", ")}`);
    }
  }

  // Brief analysis
  lines.push("");
  const totalPeople = people.length;
  const conflictCount = people.filter((p) => p.sentiment === "conflict" || p.sentiment === "tension").length;
  if (conflictCount > 0 && totalPeople > 0) {
    const pct = Math.round((conflictCount / totalPeople) * 100);
    lines.push(`${pct}% das suas relacoes mapeadas tem alguma tensao. Vale refletir sobre isso.`);
  } else {
    lines.push("Suas relacoes estao majoritariamente positivas. Continue investindo nelas.");
  }

  return lines.join("\n");
}

export function formatNetworkReport(people: Person[], health: RelationshipHealth[]): string {
  if (people.length === 0) {
    return "Nenhum relacionamento mapeado ainda.";
  }

  const lines: string[] = [];
  lines.push("=== Rede de Relacionamentos ===\n");

  const groups = groupByCategory(people);

  for (const [category, members] of groups) {
    const catHealth = health.find((h) => h.category === category);
    const score = catHealth ? catHealth.healthScore : 0;
    const indicator = healthIndicator(score);

    lines.push(`${CATEGORY_LABELS[category]} ${indicator} (${score.toFixed(1)}/10)`);

    const sorted = [...members].sort((a, b) => b.mentionCount - a.mentionCount);
    for (const person of sorted) {
      const sentimentLabel: Record<Person["sentiment"], string> = {
        positive: "+",
        neutral: "~",
        tension: "!",
        conflict: "X",
      };
      const lastDays = Math.floor((Date.now() - person.lastMentioned) / (24 * 60 * 60 * 1000));
      const contactLabel = lastDays === 0 ? "hoje" : `${lastDays}d atras`;
      lines.push(`  ${sentimentLabel[person.sentiment]} ${person.name} (${person.mentionCount}x, ${contactLabel})`);
    }
    lines.push("");
  }

  // Summary
  const totalPositive = health.reduce((sum, h) => sum + h.positiveMentions, 0);
  const totalNegative = health.reduce((sum, h) => sum + h.negativeMentions, 0);
  lines.push(`Total: ${people.length} pessoas, ${totalPositive} mencoes positivas, ${totalNegative} negativas.`);

  return lines.join("\n");
}

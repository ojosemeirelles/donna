/**
 * Shadow Orchestrator — routes messages to the right shadow based on intent.
 */

import type { Rank } from "../evolution/level.js";
import { loadRegistry, getShadowByRole } from "./extractor.js";
import type { ShadowDefinition, ShadowIntent, ShadowRegistry } from "./types.js";

/** Classify a user message into a shadow intent. */
export function classifyIntent(message: string): ShadowIntent {
  const lower = message.toLowerCase();

  // Exec patterns
  if (/(exec|run\b|execute|roda\b|terminal|shell|comando|command|abr[ae]|open\s+app)/.test(lower)) {
    return "exec";
  }
  // Research patterns
  if (/(pesquis|search\b|busca\b|find out|look up|investig|googl[aei])/.test(lower)) {
    return "research";
  }
  // Write patterns
  if (/(escrev|write\b|draft\b|redigi|email\b|document|texto|content\b|artigo)/.test(lower)) {
    return "write";
  }
  // Schedule patterns
  if (/(agenda|schedul|remind|lembr|cron\b|timer|alarm|horario)/.test(lower)) {
    return "schedule";
  }
  // Analyze patterns
  if (/(analis|analyz|report\b|relatorio|dashboard|metric|insight|estrateg)/.test(lower)) {
    return "analyze";
  }
  // Browse patterns
  if (/(browse|navega?|screenshot|pagina|website|url|scrape|canvas)/.test(lower)) {
    return "browse";
  }
  // Monitor patterns
  if (/(monitor|watch\b|vigia?|vigil|log\b|observ|track\b|silent)/.test(lower)) {
    return "monitor";
  }

  // Default: no shadow delegation
  return "complex";
}

const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

function rankMeetsRequirement(currentRank: Rank, required: Rank): boolean {
  return RANK_ORDER.indexOf(currentRank) >= RANK_ORDER.indexOf(required);
}

export type OrchestrateResult = {
  delegated: boolean;
  shadow: ShadowDefinition | null;
  intent: ShadowIntent;
  reason: string;
};

/** Determine which shadow (if any) should handle a message. */
export async function orchestrate(message: string, donnaRank: Rank): Promise<OrchestrateResult> {
  const intent = classifyIntent(message);
  let registry: ShadowRegistry;

  try {
    registry = await loadRegistry();
  } catch {
    return {
      delegated: false,
      shadow: null,
      intent,
      reason: "Shadow registry not found",
    };
  }

  const shadow = getShadowByRole(intent, registry);

  if (!shadow) {
    return {
      delegated: false,
      shadow: null,
      intent,
      reason: `No active shadow for intent "${intent}"`,
    };
  }

  if (!rankMeetsRequirement(donnaRank, shadow.rank_required)) {
    return {
      delegated: false,
      shadow,
      intent,
      reason: `Rank ${donnaRank} insufficient for ${shadow.name} (requires ${shadow.rank_required})`,
    };
  }

  return {
    delegated: true,
    shadow,
    intent,
    reason: `Delegated to ${shadow.name} (${shadow.role})`,
  };
}

/** Get a summary of all shadows and their status. */
export async function getShadowArmyStatus(): Promise<string> {
  let registry: ShadowRegistry;
  try {
    registry = await loadRegistry();
  } catch {
    return "Shadow Army: registry not found";
  }

  const lines: string[] = [];
  lines.push(`Shadow Army do Monarca ${registry.monarch}`);
  lines.push("");

  const active = registry.shadows.filter((s) => s.status === "active");
  const locked = registry.shadows.filter((s) => s.status === "locked");

  if (active.length > 0) {
    lines.push(`Sombras ativas (${active.length}):`);
    for (const s of active) {
      lines.push(`  ${s.name} — ${s.role}`);
    }
  }

  if (locked.length > 0) {
    lines.push(`Sombras bloqueadas (${locked.length}):`);
    for (const s of locked) {
      lines.push(`  ${s.name} [Rank ${s.rank_required}] — ${s.role}`);
    }
  }

  return lines.join("\n");
}

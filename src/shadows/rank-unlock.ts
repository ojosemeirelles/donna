/**
 * Rank Unlock — automatically extracts shadows when Donna reaches new ranks.
 */

import type { Rank } from "../evolution/level.js";
import { loadRegistry } from "./extractor.js";
import { extractShadow } from "./extractor.js";
import type { ShadowDefinition } from "./types.js";

const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export type UnlockResult = {
  unlocked: ShadowDefinition[];
  messages: string[];
};

/**
 * Check which shadows should be unlocked at the new rank
 * and extract them automatically.
 */
export async function checkShadowUnlocks(newRank: Rank): Promise<UnlockResult> {
  let registry;
  try {
    registry = await loadRegistry();
  } catch {
    return { unlocked: [], messages: [] };
  }

  const newRankIdx = rankIndex(newRank);
  const toUnlock = registry.shadows.filter(
    (s) => s.status === "locked" && rankIndex(s.rank_required) <= newRankIdx,
  );

  const unlocked: ShadowDefinition[] = [];
  const messages: string[] = [];

  for (const shadow of toUnlock) {
    const result = await extractShadow(shadow.name);
    if (result.ok) {
      unlocked.push(result.shadow);
      messages.push(
        `🖤 Nova sombra extraida: [${shadow.name.toUpperCase()}] se juntou ao Exercito das Sombras — ${shadow.role}`,
      );
    }
  }

  return { unlocked, messages };
}

/** Format shadow unlock messages for Telegram notification. */
export function formatShadowUnlockMessage(result: UnlockResult): string | null {
  if (result.unlocked.length === 0) {
    return null;
  }

  const lines: string[] = [];
  lines.push("*ARISE!*");
  lines.push("");

  for (const shadow of result.unlocked) {
    lines.push(`🖤 *${shadow.name}* — ${shadow.role}`);
    lines.push(`_${shadow.soul}_`);
    lines.push("");
  }

  lines.push(`Total de sombras no exercito: ${result.unlocked.length} novas`);
  lines.push("");
  lines.push("---");
  lines.push("_Donna Shadow Army System v1.0_");

  return lines.join("\n");
}

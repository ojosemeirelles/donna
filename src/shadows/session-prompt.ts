/**
 * Shadow Session Prompt Builder — constructs system prompts for shadow sessions.
 * Each shadow gets a persona-specific prompt built from SOUL.md + restrictions + parent context.
 */

import type { ShadowDefinition, ParentContext } from "./types.js";

/**
 * Build the system prompt injected into a shadow's dedicated session.
 * Combines the shadow's SOUL.md persona with tool restrictions and parent context.
 */
export function buildShadowSystemPrompt(
  shadow: ShadowDefinition,
  soulMd: string,
  parentContext: ParentContext,
): string {
  return [
    `# ${shadow.name} — ${shadow.role}`,
    "",
    soulMd,
    "",
    "## Restrictions",
    `- Tools: ${shadow.tools.join(", ")}`,
    "- Respond in the user's language",
    "- Do NOT delegate to other shadows",
    "- Max response: concise, actionable",
    "",
    "## Context from Monarch session",
    `- Channel: ${parentContext.channel ?? "unknown"}`,
    `- User: ${parentContext.userId}`,
    parentContext.summary ? `- Summary: ${parentContext.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Shadow Session Prompt Builder — constructs system prompts for shadow sessions.
 * Each shadow gets a persona-specific prompt built from SOUL.md + persistent memory files + restrictions + parent context.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildTaskContextBlock, buildNotificationContextBlock } from "./mission-control.js";
import type { ShadowDefinition, ParentContext } from "./types.js";

/** Try to read a file, returning empty string if it doesn't exist. */
async function tryReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Resolve the shadow's persistent directory under ~/.donna/shadows/{name}/ */
export function resolveShadowDir(shadowName: string): string {
  return path.join(os.homedir(), ".donna", "shadows", shadowName);
}

/** Resolve the WORKING.md path for a shadow. */
export function resolveWorkingMdPath(shadowName: string): string {
  return path.join(resolveShadowDir(shadowName), "WORKING.md");
}

/**
 * Build the system prompt injected into a shadow's dedicated session.
 * Combines the shadow's SOUL.md persona, persistent memory files, tool restrictions, and parent context.
 * Order: SOUL.md → AGENTS.md → HEARTBEAT.md → Persistent Memory (WORKING.md) → Restrictions → Context
 */
export async function buildShadowSystemPrompt(
  shadow: ShadowDefinition,
  soulMd: string,
  parentContext: ParentContext,
): Promise<string> {
  // Load persistent memory files (silently skip missing ones)
  const shadowDir = resolveShadowDir(shadow.name.toLowerCase());
  const workingMdPath = path.join(shadowDir, "memory", "WORKING.md");
  const [agentsMd, heartbeatMd, workingMd] = await Promise.all([
    tryReadFile(path.join(shadowDir, "AGENTS.md")),
    tryReadFile(path.join(shadowDir, "HEARTBEAT.md")),
    tryReadFile(workingMdPath),
  ]);

  // Build persistent memory section with working state + write-back directive
  const persistentMemoryLines = [
    "## Persistent Memory",
    "",
    `Your working memory file: \`${workingMdPath}\``,
  ];
  if (workingMd) {
    persistentMemoryLines.push("", "### Current State (loaded from WORKING.md)", "", workingMd);
  } else {
    persistentMemoryLines.push("", "No prior working state found. This is a fresh session.");
  }
  persistentMemoryLines.push(
    "",
    "### DIRECTIVE (mandatory)",
    "At the end of each task or heartbeat cycle, you MUST update your WORKING.md file using the file-write tool.",
    "Write a brief summary with:",
    "- **Status:** what was accomplished",
    "- **Next step:** what to do next",
    "- **Context:** any data needed to resume (IDs, file paths, decisions)",
    "This ensures you can resume work across sessions without losing context.",
  );

  return [
    `# ${shadow.name} — ${shadow.role}`,
    "",
    soulMd,
    "",
    agentsMd,
    heartbeatMd,
    persistentMemoryLines.join("\n"),
    "",
    // Mission Control: inject pending tasks (all shadows) + notifications (Igris only)
    buildTaskContextBlock(shadow.name),
    shadow.name === "Igris" ? buildNotificationContextBlock() : "",
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

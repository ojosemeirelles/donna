/**
 * Shadow Army — Solo Leveling themed sub-agent system.
 * Donna is the Monarch. Shadows are specialized agents unlocked by rank.
 */

import type { Rank } from "../evolution/level.js";

export type ShadowStatus = "locked" | "active" | "dormant";

export type ShadowDefinition = {
  name: string;
  role: string;
  squad: string;
  rank_required: Rank;
  status: ShadowStatus;
  tools: string[];
  soul: string;
};

export type ShadowRegistry = {
  monarch: string;
  shadows: ShadowDefinition[];
};

export type ShadowIntent =
  | "research"
  | "write"
  | "exec"
  | "schedule"
  | "analyze"
  | "browse"
  | "monitor"
  | "complex";

export const INTENT_TO_SHADOW: Record<ShadowIntent, string> = {
  research: "Tusk",
  write: "Iron",
  exec: "Beru",
  schedule: "Tank",
  analyze: "Bellion",
  browse: "Kaisel",
  monitor: "Jima",
  complex: "Igris",
};

// --- Shadow Sessions (DONNA-004) ---

export type ShadowSessionMeta = {
  shadowName: string;
  shadowIntent: ShadowIntent;
  parentSessionId: string;
  createdAt: number;
  lastActiveAt: number;
  executionCount: number;
};

export type ShadowExecution = {
  id: string;
  shadowName: string;
  intent: ShadowIntent;
  parentSessionId: string;
  startedAt: number;
  durationMs: number;
  tokenUsage: { input: number; output: number };
  status: "completed" | "failed" | "aborted";
  error?: string;
};

export type ParentContext = {
  channel: string | undefined;
  userId: string;
  summary: string | null;
};

export type ShadowDispatchResult = {
  response: string;
  shadowName: string;
  sessionId: string;
  durationMs: number;
  tokenUsage?: { input: number; output: number };
};

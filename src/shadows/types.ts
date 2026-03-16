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
  | "complex"
  | "calendar"
  | "finance"
  | "shopping"
  | "notion"
  | "drive"
  | "whatsapp"
  | "social"
  | "analytics"
  | "ads"
  | "crm"
  | "slack"
  | "github"
  | "shopify"
  | "home"
  | "soul"
  | "soul-dreams"
  | "soul-productivity"
  | "soul-relationships";

export const INTENT_TO_SHADOW: Record<ShadowIntent, string> = {
  research: "Tusk",
  write: "Iron",
  exec: "Beru",
  schedule: "Tank",
  analyze: "Bellion",
  browse: "Kaisel",
  monitor: "Jima",
  complex: "Igris",
  calendar: "Tank",
  finance: "Bellion",
  shopping: "Kaisel",
  notion: "Iron",
  drive: "Tusk",
  whatsapp: "Igris",
  social: "Iron",
  analytics: "Bellion",
  ads: "Bellion",
  crm: "Bellion",
  slack: "Jima",
  github: "Jima",
  shopify: "Bellion",
  home: "Beru",
  soul: "Igris",
  "soul-dreams": "Igris",
  "soul-productivity": "Igris",
  "soul-relationships": "Igris",
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

// --- Heartbeat (DONNA-007) ---

export type HeartbeatResult = {
  shadowName: string;
  status: "awake" | "sleep" | "failed";
  response?: string;
  durationMs: number;
  error?: string;
  timestamp: number;
};

export type HeartbeatCycleReport = {
  cycleId: string;
  startedAt: number;
  completedAt: number;
  results: HeartbeatResult[];
  awake: number;
  sleeping: number;
  failed: number;
};

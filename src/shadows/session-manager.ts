/**
 * Shadow Session Manager — dispatches messages to shadow sub-sessions.
 * Bridges the Shadow Army orchestrator with the Pi embedded runner,
 * giving each shadow a dedicated session with its own SOUL.md system prompt.
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { classifyIntent } from "./orchestrator.js";
import { buildShadowSystemPrompt } from "./session-prompt.js";
import type {
  ShadowDefinition,
  ShadowSessionMeta,
  ShadowDispatchResult,
  ShadowExecution,
  ParentContext,
} from "./types.js";

// Default execution limits (overridable via env)
const DEFAULT_EXEC_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function resolveExecTimeoutMs(): number {
  const env = process.env.DONNA_SHADOW_EXEC_TIMEOUT_MS;
  return env ? Number.parseInt(env, 10) || DEFAULT_EXEC_TIMEOUT_MS : DEFAULT_EXEC_TIMEOUT_MS;
}

function resolveMaxConcurrent(): number {
  const env = process.env.DONNA_SHADOW_MAX_CONCURRENT;
  return env ? Number.parseInt(env, 10) || DEFAULT_MAX_CONCURRENT : DEFAULT_MAX_CONCURRENT;
}

function resolveSessionTtlMs(): number {
  const env = process.env.DONNA_SHADOW_SESSION_TTL_MS;
  return env ? Number.parseInt(env, 10) || DEFAULT_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
}

/**
 * Build a deterministic session ID for a shadow + parent pair.
 * Format: `shadow:{shadowName}:{parentSessionId}`
 */
export function buildShadowSessionId(shadowName: string, parentSessionId: string): string {
  return `shadow:${shadowName.toLowerCase()}:${parentSessionId}`;
}

/** Load SOUL.md for a shadow from ~/.donna/shadows/{name}/SOUL.md */
async function loadSoulMd(shadowName: string): Promise<string> {
  const soulPath = join(homedir(), ".donna", "shadows", shadowName.toLowerCase(), "SOUL.md");
  return readFile(soulPath, "utf-8");
}

// In-memory session metadata store (persisted to sessions.json via the session store)
const activeSessions = new Map<string, ShadowSessionMeta>();

/**
 * Get or create shadow session metadata for a given shadow + parent pair.
 */
export function getOrCreateSession(
  shadowName: string,
  intent: import("./types.js").ShadowIntent,
  parentSessionId: string,
): { sessionId: string; meta: ShadowSessionMeta; created: boolean } {
  const sessionId = buildShadowSessionId(shadowName, parentSessionId);
  const existing = activeSessions.get(sessionId);

  if (existing) {
    existing.lastActiveAt = Date.now();
    existing.executionCount += 1;
    return { sessionId, meta: existing, created: false };
  }

  const now = Date.now();
  const meta: ShadowSessionMeta = {
    shadowName,
    shadowIntent: intent,
    parentSessionId,
    createdAt: now,
    lastActiveAt: now,
    executionCount: 1,
  };
  activeSessions.set(sessionId, meta);
  return { sessionId, meta, created: true };
}

/**
 * Destroy a shadow session (remove from active tracking).
 */
export function destroySession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

/**
 * List all active shadow sessions.
 */
export function listActiveSessions(): Array<{ sessionId: string; meta: ShadowSessionMeta }> {
  return Array.from(activeSessions.entries()).map(([sessionId, meta]) => ({
    sessionId,
    meta,
  }));
}

/**
 * Count active shadow sessions for a given parent.
 */
export function countActiveForParent(parentSessionId: string): number {
  let count = 0;
  for (const meta of activeSessions.values()) {
    if (meta.parentSessionId === parentSessionId) {
      count += 1;
    }
  }
  return count;
}

/**
 * Prune shadow sessions that have exceeded the idle TTL.
 */
export function pruneStaleSessions(): string[] {
  const ttl = resolveSessionTtlMs();
  const now = Date.now();
  const pruned: string[] = [];

  for (const [sessionId, meta] of activeSessions.entries()) {
    if (now - meta.lastActiveAt > ttl) {
      activeSessions.delete(sessionId);
      pruned.push(sessionId);
    }
  }

  return pruned;
}

export type DispatchDeps = {
  runEmbeddedPiAgent: (params: {
    sessionId: string;
    sessionKey?: string;
    spawnedBy?: string;
    prompt: string;
    extraSystemPrompt?: string;
    sessionFile: string;
    workspaceDir: string;
    provider?: string;
    model?: string;
    authProfileId?: string;
    timeoutMs: number;
    runId: string;
    abortSignal?: AbortSignal;
    messageChannel?: string;
    messageProvider?: string;
    messageTo?: string;
  }) => Promise<{
    payloads?: Array<{ text?: string; mediaUrl?: string; isError?: boolean }>;
    meta: {
      durationMs: number;
      agentMeta?: {
        usage?: { input?: number; output?: number };
      };
    };
  }>;
};

/**
 * Dispatch a message to a shadow session.
 * Creates the session if needed, builds the system prompt from SOUL.md,
 * and runs via the Pi embedded runner.
 */
export async function dispatch(
  message: string,
  shadow: ShadowDefinition,
  parentSession: {
    sessionId: string;
    chatType?: string;
    providerOverride?: string;
    modelOverride?: string;
    authProfileOverride?: string;
    sessionFile?: string;
    channel?: string;
  },
  deps: DispatchDeps,
  options?: {
    workspaceDir?: string;
    abortSignal?: AbortSignal;
    messageChannel?: string;
    messageProvider?: string;
    messageTo?: string;
  },
): Promise<ShadowDispatchResult> {
  const intent = classifyIntent(message);

  // Enforce concurrency limit
  const maxConcurrent = resolveMaxConcurrent();
  const activeCount = countActiveForParent(parentSession.sessionId);
  if (activeCount >= maxConcurrent) {
    throw new Error(
      `Shadow concurrency limit reached (${activeCount}/${maxConcurrent}) for parent ${parentSession.sessionId}`,
    );
  }

  // Get or create session
  const { sessionId } = getOrCreateSession(shadow.name, intent, parentSession.sessionId);

  // Load SOUL.md
  let soulMd: string;
  try {
    soulMd = await loadSoulMd(shadow.name);
  } catch {
    throw new Error(`SOUL.md not found for shadow "${shadow.name}". Run shadow extraction first.`);
  }

  // Build system prompt
  const parentContext: ParentContext = {
    channel: parentSession.chatType ?? parentSession.channel,
    userId: parentSession.sessionId,
    summary: null, // future: compact parent transcript
  };
  const systemPrompt = await buildShadowSystemPrompt(shadow, soulMd, parentContext);

  // Resolve session file path for shadow
  const shadowSessionFile = join(
    homedir(),
    ".donna",
    "shadows",
    shadow.name.toLowerCase(),
    "session.jsonl",
  );

  const timeoutMs = resolveExecTimeoutMs();
  const runId = randomUUID();

  // Run via Pi embedded runner
  const result = await deps.runEmbeddedPiAgent({
    sessionId,
    sessionKey: sessionId,
    spawnedBy: parentSession.sessionId,
    prompt: message,
    extraSystemPrompt: systemPrompt,
    sessionFile: shadowSessionFile,
    workspaceDir: options?.workspaceDir ?? join(homedir(), ".donna", "workspace"),
    provider: parentSession.providerOverride,
    model: parentSession.modelOverride,
    authProfileId: parentSession.authProfileOverride,
    timeoutMs,
    runId,
    abortSignal: options?.abortSignal,
    messageChannel: options?.messageChannel,
    messageProvider: options?.messageProvider,
    messageTo: options?.messageTo,
  });

  // Extract response text from payloads
  const responseText =
    result.payloads
      ?.filter((p) => !p.isError)
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n") ?? "";

  const tokenUsage = result.meta.agentMeta?.usage
    ? {
        input: result.meta.agentMeta.usage.input ?? 0,
        output: result.meta.agentMeta.usage.output ?? 0,
      }
    : undefined;

  return {
    response: responseText,
    shadowName: shadow.name,
    sessionId,
    durationMs: result.meta.durationMs,
    tokenUsage,
  };
}

/** Build a ShadowExecution record for tracking. */
export function buildExecutionRecord(
  dispatchResult: ShadowDispatchResult,
  intent: import("./types.js").ShadowIntent,
  parentSessionId: string,
  startedAt: number,
  error?: string,
): ShadowExecution {
  return {
    id: randomUUID(),
    shadowName: dispatchResult.shadowName,
    intent,
    parentSessionId,
    startedAt,
    durationMs: dispatchResult.durationMs,
    tokenUsage: dispatchResult.tokenUsage ?? { input: 0, output: 0 },
    status: error ? "failed" : "completed",
    error,
  };
}

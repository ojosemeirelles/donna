/**
 * PI Framework runtime adapter.
 *
 * This is the ONLY file that should import `@mariozechner/pi-*` packages
 * for runtime session lifecycle.  All other code should depend on the
 * `AgentRuntime` interface from `./agent-runtime.ts`.
 *
 * Current PI packages wrapped:
 * - `@mariozechner/pi-coding-agent` (createAgentSession, SessionManager,
 *    estimateTokens, generateSummary)
 * - `@mariozechner/pi-agent-core` (types only -- AgentTool, AgentMessage)
 */

import type { AgentMessage as PiAgentMessage } from "@mariozechner/pi-agent-core";
import {
  createAgentSession,
  estimateTokens,
  generateSummary,
  type CreateAgentSessionOptions,
} from "@mariozechner/pi-coding-agent";
import type {
  AgentRuntime,
  AgentSessionConfig,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentMessage as RuntimeAgentMessage,
} from "./agent-runtime.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Adapt the runtime-agnostic session config into the shape expected by
 * `createAgentSession` from PI.
 *
 * Fields typed as `unknown` in the adapter interface are cast through
 * `unknown` to PI's concrete types here -- this is the ONE place where
 * the coupling lives.
 */
function toPiSessionConfig(config: AgentSessionConfig): CreateAgentSessionOptions {
  return {
    cwd: config.cwd,
    agentDir: config.agentDir,
    authStorage: config.authStorage as CreateAgentSessionOptions["authStorage"],
    modelRegistry: config.modelRegistry as CreateAgentSessionOptions["modelRegistry"],
    model: config.model as unknown as CreateAgentSessionOptions["model"],
    thinkingLevel: config.thinkingLevel as CreateAgentSessionOptions["thinkingLevel"],
    tools: config.tools as CreateAgentSessionOptions["tools"],
    customTools: config.customTools as CreateAgentSessionOptions["customTools"],
    sessionManager: config.sessionManager as CreateAgentSessionOptions["sessionManager"],
    settingsManager: config.settingsManager as CreateAgentSessionOptions["settingsManager"],
    resourceLoader: config.resourceLoader as CreateAgentSessionOptions["resourceLoader"],
  };
}

// ---------------------------------------------------------------------------
// PiAgentRuntime
// ---------------------------------------------------------------------------

/**
 * `AgentRuntime` backed by the `@mariozechner/pi-*` framework.
 *
 * Wraps `createAgentSession`, `estimateTokens`, and `generateSummary` so
 * the rest of Donna's code never imports PI directly for session lifecycle.
 */
export class PiAgentRuntime implements AgentRuntime {
  readonly name = "pi";

  isAvailable(): boolean {
    // PI is a hard dependency today -- always available when installed.
    // A future "stub" runtime could return false here.
    try {
      return typeof createAgentSession === "function";
    } catch {
      return false;
    }
  }

  async createSession(
    config: AgentSessionConfig,
  ): Promise<AgentSessionHandle> {
    const piConfig = toPiSessionConfig(config);
    const { session } = await createAgentSession(piConfig);

    if (!session) {
      throw new Error("PI runtime: createAgentSession returned no session");
    }

    return new PiSessionHandle(session);
  }

  estimateTokens(text: string): number {
    // PI's estimateTokens expects an AgentMessage, but we expose a simpler
    // string-based API.  Wrap the string as a minimal user message.
    const syntheticMessage = {
      role: "user",
      content: [{ type: "text", text }],
    } as unknown as PiAgentMessage;
    return estimateTokens(syntheticMessage);
  }

  async generateSummary(
    messages: RuntimeAgentMessage[],
    options?: {
      model?: unknown;
      reserveTokens?: number;
      apiKey?: string;
      signal?: AbortSignal;
      customInstructions?: string;
      previousSummary?: string;
    },
  ): Promise<string> {
    // generateSummary from PI has a wider signature:
    //   (messages, model, reserveTokens, apiKey, signal?, customInstructions?, previousSummary?)
    const piMessages = messages as unknown as PiAgentMessage[];
    const model = (options?.model ?? {}) as Parameters<typeof generateSummary>[1];
    const reserveTokens = options?.reserveTokens ?? 4096;
    const apiKey = options?.apiKey ?? "";
    return generateSummary(
      piMessages,
      model,
      reserveTokens,
      apiKey,
      options?.signal,
      options?.customInstructions,
      options?.previousSummary,
    );
  }
}

// ---------------------------------------------------------------------------
// PiSessionHandle
// ---------------------------------------------------------------------------

type PiSession = Awaited<ReturnType<typeof createAgentSession>>["session"];

class PiSessionHandle implements AgentSessionHandle {
  readonly agent: unknown;
  readonly sessionId: string;
  private readonly _session: PiSession;

  constructor(session: PiSession) {
    this._session = session;
    this.agent = session.agent;
    this.sessionId = session.sessionId;
  }

  /**
   * Send a message and yield session events.
   *
   * NOTE: The current PI SDK does not expose a direct "send + stream"
   * method on the session object -- the actual streaming is wired via
   * `subscribeEmbeddedPiSession` in `pi-embedded-subscribe.ts`.
   *
   * This thin wrapper yields a single "done" event for now; the full
   * event-stream integration will happen when consumers migrate.
   */
  async *sendMessage(_message: string): AsyncIterable<AgentSessionEvent> {
    // Phase 1: placeholder -- full streaming will be wired when
    // `runEmbeddedPiAgent` is refactored to use the adapter.
    yield { type: "done", data: null };
  }

  async stop(): Promise<void> {
    // PI sessions do not expose an explicit stop(); the abort is handled
    // via `abortEmbeddedPiRun` at a higher level.  Kept as a no-op so
    // consumers can call it uniformly.
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create the default PI-backed runtime. */
export function createPiAgentRuntime(): AgentRuntime {
  return new PiAgentRuntime();
}

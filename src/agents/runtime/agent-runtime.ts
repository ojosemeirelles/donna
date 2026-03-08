/**
 * AgentRuntime adapter interface.
 *
 * Abstracts the PI agent framework (`@mariozechner/pi-*`) behind a stable
 * contract so the rest of the codebase never imports PI directly.
 *
 * The surface area exposed here mirrors what Donna actually uses from PI:
 *
 * - **pi-agent-core**: AgentMessage, AgentTool, AgentToolResult, AgentEvent,
 *   StreamFn, ThinkingLevel
 * - **pi-ai**: Model, Api, Context, complete/streamSimple, AssistantMessage,
 *   Usage, StopReason, OAuthCredentials, ImageContent, TextContent
 * - **pi-coding-agent**: createAgentSession, SessionManager, SettingsManager,
 *   AuthStorage, ModelRegistry, codingTools, skills, extensions
 *
 * The interfaces below capture the *session lifecycle* boundary -- the most
 * impactful seam.  Type re-exports and AI-level primitives remain thin
 * re-exports for now (phase 2 migration).
 */

// ---------------------------------------------------------------------------
// Core message / tool types (mirrors pi-agent-core)
// ---------------------------------------------------------------------------

/** Opaque agent message -- kept intentionally loose to avoid coupling. */
export type AgentMessage = {
  role: string;
  content: unknown;
  [key: string]: unknown;
};

/** Result returned by a tool execution. */
export interface AgentToolResult {
  content: string;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

/** Callback for tool progress updates. */
export type AgentToolUpdateCallback = (update: {
  content?: string;
  metadata?: Record<string, unknown>;
}) => void;

/** Tool definition understood by the runtime. */
export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    update?: AgentToolUpdateCallback,
  ) => Promise<AgentToolResult>;
}

/** Streaming function signature. */
export type StreamFunction = (
  model: unknown,
  context: unknown,
  options?: Record<string, unknown>,
) => AsyncIterable<unknown>;

// ---------------------------------------------------------------------------
// Session types (mirrors pi-coding-agent session lifecycle)
// ---------------------------------------------------------------------------

/** Configuration for creating an agent session. */
export interface AgentSessionConfig {
  /** Working directory for the session. */
  cwd: string;
  /** Agent-specific data directory. */
  agentDir: string;
  /** Auth credential storage. */
  authStorage: unknown;
  /** Model registry for provider discovery. */
  modelRegistry: unknown;
  /** Model configuration. */
  model: AgentModelConfig;
  /** Thinking/reasoning level. */
  thinkingLevel?: string;
  /** Built-in SDK tools. */
  tools?: AgentToolDefinition[];
  /** Custom (Donna) tools. */
  customTools?: AgentToolDefinition[];
  /** Session persistence manager. */
  sessionManager: unknown;
  /** Project-level settings manager. */
  settingsManager?: unknown;
  /** Resource loader for workspace files. */
  resourceLoader?: unknown;
}

/** Model configuration for a session. */
export interface AgentModelConfig {
  id: string;
  api?: string;
  provider?: string;
  baseUrl?: string;
  contextWindow?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

/** Handle to a running agent session. */
export interface AgentSessionHandle {
  /** The underlying agent object (opaque -- typed by the runtime). */
  agent: unknown;
  /** Session persistence identifier. */
  sessionId: string;
  /** Send a user message and get streaming events. */
  sendMessage(message: string): AsyncIterable<AgentSessionEvent>;
  /** Stop / abort the session. */
  stop(): Promise<void>;
}

/** Events emitted during a session run. */
export interface AgentSessionEvent {
  type:
    | "text"
    | "tool_call_start"
    | "tool_call_end"
    | "thinking"
    | "error"
    | "usage"
    | "done";
  data: unknown;
}

/** Usage statistics from a session run. */
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Runtime interface
// ---------------------------------------------------------------------------

/**
 * The main abstraction over the AI agent runtime.
 *
 * Implementations wrap a concrete framework (PI, or a future replacement)
 * and expose session lifecycle + tool management through this contract.
 */
export interface AgentRuntime {
  /** Human-readable runtime name (for logging / diagnostics). */
  readonly name: string;

  /** Whether the runtime's dependencies are available. */
  isAvailable(): boolean;

  /** Create a new agent session. */
  createSession(config: AgentSessionConfig): Promise<AgentSessionHandle>;

  /** Estimate token count for a string (used for context window math). */
  estimateTokens(text: string): number;

  /** Generate a compaction summary of messages. */
  generateSummary(
    messages: AgentMessage[],
    options?: {
      model?: unknown;
      reserveTokens?: number;
      apiKey?: string;
      signal?: AbortSignal;
      customInstructions?: string;
      previousSummary?: string;
    },
  ): Promise<string>;
}

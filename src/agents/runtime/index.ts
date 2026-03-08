/**
 * Agent runtime adapter -- public API.
 *
 * Import from `src/agents/runtime` to get the runtime-agnostic interface
 * and the default PI-backed factory.
 */

// Interface + types
export type {
  AgentMessage,
  AgentModelConfig,
  AgentRuntime,
  AgentSessionConfig,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentToolDefinition,
  AgentToolResult,
  AgentToolUpdateCallback,
  AgentUsage,
  StreamFunction,
} from "./agent-runtime.js";

// Default runtime factory
export { createPiAgentRuntime, PiAgentRuntime } from "./pi-runtime.js";

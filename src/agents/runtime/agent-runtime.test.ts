import { describe, expect, it } from "vitest";
import type {
  AgentRuntime,
  AgentSessionConfig,
  AgentSessionHandle,
} from "./agent-runtime.js";

// ---------------------------------------------------------------------------
// Mock runtime -- validates the interface contract without PI dependency
// ---------------------------------------------------------------------------

class MockAgentRuntime implements AgentRuntime {
  readonly name = "mock";
  private available = true;
  public lastConfig: AgentSessionConfig | undefined;

  setAvailable(value: boolean): void {
    this.available = value;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async createSession(config: AgentSessionConfig): Promise<AgentSessionHandle> {
    this.lastConfig = config;
    return {
      agent: { mock: true },
      sessionId: `mock-session-${Date.now()}`,
      async *sendMessage(_message: string) {
        yield { type: "text" as const, data: { content: "mock reply" } };
        yield { type: "done" as const, data: null };
      },
      async stop() {
        // no-op
      },
    };
  }

  estimateTokens(text: string): number {
    // Rough approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  async generateSummary(
    _messages: import("./agent-runtime.js").AgentMessage[],
    _options?: {
      model?: unknown;
      reserveTokens?: number;
      apiKey?: string;
      signal?: AbortSignal;
      customInstructions?: string;
      previousSummary?: string;
    },
  ): Promise<string> {
    return "Mock summary of conversation.";
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentRuntime interface", () => {
  it("mock runtime satisfies the interface", () => {
    const runtime: AgentRuntime = new MockAgentRuntime();
    expect(runtime.name).toBe("mock");
    expect(runtime.isAvailable()).toBe(true);
  });

  it("isAvailable can report unavailability", () => {
    const runtime = new MockAgentRuntime();
    runtime.setAvailable(false);
    expect(runtime.isAvailable()).toBe(false);
  });

  it("createSession returns a handle with expected shape", async () => {
    const runtime = new MockAgentRuntime();
    const config: AgentSessionConfig = {
      cwd: "/tmp/test",
      agentDir: "/tmp/test/.donna",
      authStorage: {},
      modelRegistry: {},
      model: {
        id: "gpt-4o",
        api: "openai-completions",
        provider: "openai",
        contextWindow: 128_000,
      },
      thinkingLevel: "off",
      sessionManager: {},
    };

    const session = await runtime.createSession(config);
    expect(session.sessionId).toBeDefined();
    expect(typeof session.sessionId).toBe("string");
    expect(session.agent).toBeDefined();
    expect(typeof session.stop).toBe("function");
    expect(typeof session.sendMessage).toBe("function");
  });

  it("sendMessage yields events ending with done", async () => {
    const runtime = new MockAgentRuntime();
    const session = await runtime.createSession({
      cwd: "/tmp",
      agentDir: "/tmp/.donna",
      authStorage: {},
      modelRegistry: {},
      model: { id: "test-model" },
      sessionManager: {},
    });

    const events = [];
    for await (const event of session.sendMessage("hello")) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("estimateTokens returns a positive number for non-empty text", () => {
    const runtime = new MockAgentRuntime();
    expect(runtime.estimateTokens("hello world")).toBeGreaterThan(0);
  });

  it("estimateTokens returns 0 for empty text", () => {
    const runtime = new MockAgentRuntime();
    expect(runtime.estimateTokens("")).toBe(0);
  });

  it("generateSummary returns a string", async () => {
    const runtime = new MockAgentRuntime();
    const summary = await runtime.generateSummary([]);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("createSession preserves config in mock for verification", async () => {
    const runtime = new MockAgentRuntime();
    const config: AgentSessionConfig = {
      cwd: "/workspace",
      agentDir: "/workspace/.donna",
      authStorage: { type: "file" },
      modelRegistry: {},
      model: {
        id: "claude-sonnet-4-20250514",
        provider: "anthropic",
        contextWindow: 200_000,
      },
      thinkingLevel: "low",
      sessionManager: {},
      tools: [
        {
          name: "read",
          description: "Read a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
          execute: async () => ({ content: "file contents" }),
        },
      ],
    };

    await runtime.createSession(config);
    expect(runtime.lastConfig).toBe(config);
    expect(runtime.lastConfig?.model.id).toBe("claude-sonnet-4-20250514");
    expect(runtime.lastConfig?.tools).toHaveLength(1);
  });

  it("stop is callable without error", async () => {
    const runtime = new MockAgentRuntime();
    const session = await runtime.createSession({
      cwd: "/tmp",
      agentDir: "/tmp/.donna",
      authStorage: {},
      modelRegistry: {},
      model: { id: "test" },
      sessionManager: {},
    });

    // Should not throw
    await session.stop();
  });
});

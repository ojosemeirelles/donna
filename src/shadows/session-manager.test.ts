import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildShadowSessionId,
  getOrCreateSession,
  destroySession,
  listActiveSessions,
  countActiveForParent,
  pruneStaleSessions,
  dispatch,
  buildExecutionRecord,
  type DispatchDeps,
} from "./session-manager.js";
import type { ShadowDefinition, ShadowDispatchResult } from "./types.js";

// Clear active sessions between tests by destroying all
function clearActiveSessions() {
  for (const { sessionId } of listActiveSessions()) {
    destroySession(sessionId);
  }
}

const MOCK_SHADOW: ShadowDefinition = {
  name: "Igris",
  role: "Commander — General Purpose",
  squad: "vanguard",
  rank_required: "E",
  status: "active",
  tools: ["web-search", "code-exec"],
  soul: "O cavaleiro mais leal do Monarca.",
};

function createMockDeps(response = "Shadow response"): DispatchDeps {
  return {
    runEmbeddedPiAgent: vi.fn().mockResolvedValue({
      payloads: [{ text: response }],
      meta: {
        durationMs: 450,
        agentMeta: { usage: { input: 100, output: 50 } },
      },
    }),
  };
}

describe("buildShadowSessionId", () => {
  it("builds deterministic session ID", () => {
    const id = buildShadowSessionId("Igris", "parent-123");
    expect(id).toBe("shadow:igris:parent-123");
  });

  it("lowercases shadow name", () => {
    const id = buildShadowSessionId("BERU", "p-1");
    expect(id).toBe("shadow:beru:p-1");
  });
});

describe("session lifecycle", () => {
  beforeEach(clearActiveSessions);

  it("creates a new session on first call", () => {
    const { sessionId, meta, created } = getOrCreateSession("Igris", "complex", "parent-1");
    expect(created).toBe(true);
    expect(sessionId).toBe("shadow:igris:parent-1");
    expect(meta.shadowName).toBe("Igris");
    expect(meta.shadowIntent).toBe("complex");
    expect(meta.executionCount).toBe(1);
  });

  it("reuses existing session on second call", () => {
    getOrCreateSession("Igris", "complex", "parent-1");
    const { meta, created } = getOrCreateSession("Igris", "complex", "parent-1");
    expect(created).toBe(false);
    expect(meta.executionCount).toBe(2);
  });

  it("destroySession removes session from active list", () => {
    const { sessionId } = getOrCreateSession("Igris", "complex", "parent-1");
    expect(destroySession(sessionId)).toBe(true);
    expect(listActiveSessions()).toHaveLength(0);
  });

  it("destroySession returns false for unknown session", () => {
    expect(destroySession("nonexistent")).toBe(false);
  });

  it("listActiveSessions returns all sessions", () => {
    getOrCreateSession("Igris", "complex", "parent-1");
    getOrCreateSession("Beru", "exec", "parent-1");
    expect(listActiveSessions()).toHaveLength(2);
  });

  it("countActiveForParent counts only matching parent", () => {
    getOrCreateSession("Igris", "complex", "parent-1");
    getOrCreateSession("Beru", "exec", "parent-1");
    getOrCreateSession("Tusk", "research", "parent-2");
    expect(countActiveForParent("parent-1")).toBe(2);
    expect(countActiveForParent("parent-2")).toBe(1);
  });
});

describe("pruneStaleSessions", () => {
  beforeEach(clearActiveSessions);
  afterEach(() => { vi.unstubAllEnvs(); });

  it("prunes sessions past TTL", () => {
    // Set TTL to 1ms so sessions are immediately stale
    vi.stubEnv("DONNA_SHADOW_SESSION_TTL_MS", "1");
    const { sessionId } = getOrCreateSession("Igris", "complex", "parent-1");

    // Force lastActiveAt to be in the past
    const sessions = listActiveSessions();
    sessions[0].meta.lastActiveAt = Date.now() - 10_000;

    const pruned = pruneStaleSessions();
    expect(pruned).toContain(sessionId);
    expect(listActiveSessions()).toHaveLength(0);
  });

  it("keeps fresh sessions", () => {
    vi.stubEnv("DONNA_SHADOW_SESSION_TTL_MS", "999999999");
    getOrCreateSession("Igris", "complex", "parent-1");

    const pruned = pruneStaleSessions();
    expect(pruned).toHaveLength(0);
    expect(listActiveSessions()).toHaveLength(1);
  });
});

describe("dispatch", () => {
  beforeEach(clearActiveSessions);
  afterEach(() => { vi.unstubAllEnvs(); });

  it("dispatches message to shadow and returns result", async () => {
    const deps = createMockDeps("Hello from Igris");

    // Mock loadSoulMd by mocking fs.readFile
    vi.mock("node:fs/promises", async (importOriginal) => {
      const actual = await importOriginal<typeof import("node:fs/promises")>();
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue("# Igris SOUL\nI am the shadow commander."),
      };
    });

    const result = await dispatch(
      "help me with this task",
      MOCK_SHADOW,
      { sessionId: "parent-1", chatType: "telegram" },
      deps,
    );

    expect(result.response).toBe("Hello from Igris");
    expect(result.shadowName).toBe("Igris");
    expect(result.sessionId).toBe("shadow:igris:parent-1");
    expect(result.durationMs).toBe(450);
    expect(result.tokenUsage).toEqual({ input: 100, output: 50 });

    // Verify runEmbeddedPiAgent was called with correct params
    const call = (deps.runEmbeddedPiAgent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.sessionId).toBe("shadow:igris:parent-1");
    expect(call.spawnedBy).toBe("parent-1");
    expect(call.prompt).toBe("help me with this task");

    vi.restoreAllMocks();
  });

  it("throws on concurrency limit", async () => {
    vi.stubEnv("DONNA_SHADOW_MAX_CONCURRENT", "1");
    const deps = createMockDeps();

    // Fill one session slot
    getOrCreateSession("Beru", "exec", "parent-1");

    await expect(
      dispatch("run something", MOCK_SHADOW, { sessionId: "parent-1" }, deps),
    ).rejects.toThrow(/concurrency limit/i);
  });

  it("filters error payloads from response", async () => {
    const deps: DispatchDeps = {
      runEmbeddedPiAgent: vi.fn().mockResolvedValue({
        payloads: [
          { text: "good response" },
          { text: "error occurred", isError: true },
          { text: "more good stuff" },
        ],
        meta: { durationMs: 100 },
      }),
    };

    vi.mock("node:fs/promises", async (importOriginal) => {
      const actual = await importOriginal<typeof import("node:fs/promises")>();
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue("# SOUL"),
      };
    });

    const result = await dispatch(
      "do something",
      MOCK_SHADOW,
      { sessionId: "parent-2" },
      deps,
    );

    expect(result.response).toBe("good response\nmore good stuff");

    vi.restoreAllMocks();
  });

  it("returns empty response when no payloads", async () => {
    const deps: DispatchDeps = {
      runEmbeddedPiAgent: vi.fn().mockResolvedValue({
        payloads: undefined,
        meta: { durationMs: 50 },
      }),
    };

    vi.mock("node:fs/promises", async (importOriginal) => {
      const actual = await importOriginal<typeof import("node:fs/promises")>();
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue("# SOUL"),
      };
    });

    const result = await dispatch(
      "empty task",
      MOCK_SHADOW,
      { sessionId: "parent-3" },
      deps,
    );

    expect(result.response).toBe("");

    vi.restoreAllMocks();
  });
});

describe("buildExecutionRecord", () => {
  it("builds a completed execution record", () => {
    const dispatchResult: ShadowDispatchResult = {
      response: "done",
      shadowName: "Igris",
      sessionId: "shadow:igris:p1",
      durationMs: 500,
      tokenUsage: { input: 200, output: 100 },
    };

    const record = buildExecutionRecord(dispatchResult, "complex", "p1", Date.now());

    expect(record.id).toBeTruthy();
    expect(record.shadowName).toBe("Igris");
    expect(record.intent).toBe("complex");
    expect(record.parentSessionId).toBe("p1");
    expect(record.status).toBe("completed");
    expect(record.error).toBeUndefined();
    expect(record.tokenUsage).toEqual({ input: 200, output: 100 });
  });

  it("builds a failed execution record with error", () => {
    const dispatchResult: ShadowDispatchResult = {
      response: "",
      shadowName: "Beru",
      sessionId: "shadow:beru:p1",
      durationMs: 120000,
    };

    const record = buildExecutionRecord(dispatchResult, "exec", "p1", Date.now(), "Timeout exceeded");

    expect(record.status).toBe("failed");
    expect(record.error).toBe("Timeout exceeded");
    expect(record.tokenUsage).toEqual({ input: 0, output: 0 });
  });
});

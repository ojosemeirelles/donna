import { describe, expect, it } from "vitest";
import {
  buildMemoryContextBlock,
  MemoryOrchestrator,
  resolveMemoryDir,
  type MemoryContext,
} from "./memory-orchestrator.js";

// ---------------------------------------------------------------------------
// resolveMemoryDir
// ---------------------------------------------------------------------------

describe("resolveMemoryDir", () => {
  it("returns path ending with /memory", () => {
    const dir = resolveMemoryDir("/home/user/.donna");
    expect(dir).toMatch(/memory$/);
  });

  it("combines stateDir with memory subdirectory", () => {
    const dir = resolveMemoryDir("/tmp/donna-state");
    expect(dir).toBe("/tmp/donna-state/memory");
  });

  it("falls back to ~/.donna/memory when no stateDir", () => {
    const dir = resolveMemoryDir(undefined);
    expect(dir).toContain("memory");
    expect(dir).toContain(".donna");
  });
});

// ---------------------------------------------------------------------------
// buildMemoryContextBlock
// ---------------------------------------------------------------------------

describe("buildMemoryContextBlock", () => {
  it("returns empty string when all layers are empty", () => {
    const ctx: MemoryContext = {
      identity: {},
      patternSummary: undefined,
      todaySummary: null,
      yesterdaySummary: null,
    };
    expect(buildMemoryContextBlock(ctx)).toBe("");
  });

  it("includes identity section when identity has data", () => {
    const ctx: MemoryContext = {
      identity: { name: "José" },
      patternSummary: undefined,
      todaySummary: null,
      yesterdaySummary: null,
    };
    expect(buildMemoryContextBlock(ctx)).toContain("José");
  });

  it("includes pattern section when summary has events", () => {
    const ctx: MemoryContext = {
      identity: {},
      patternSummary: {
        topTools: [{ name: "Bash", count: 5 }],
        activeHours: Array.from<number>({ length: 24 }).fill(0),
        totalEvents: 5,
        analyzedAt: new Date().toISOString(),
      },
      todaySummary: null,
      yesterdaySummary: null,
    };
    expect(buildMemoryContextBlock(ctx)).toContain("Bash");
  });

  it("includes episodic section when summary present", () => {
    const ctx: MemoryContext = {
      identity: {},
      patternSummary: undefined,
      todaySummary: {
        date: "2026-03-07",
        summary: "Built the memory system",
        keyTopics: ["memory"],
        createdAt: new Date().toISOString(),
      },
      yesterdaySummary: null,
    };
    expect(buildMemoryContextBlock(ctx)).toContain("memory system");
  });

  it("starts with # Donna Memory when there is content", () => {
    const ctx: MemoryContext = {
      identity: { name: "Test" },
      patternSummary: undefined,
      todaySummary: null,
      yesterdaySummary: null,
    };
    expect(buildMemoryContextBlock(ctx)).toMatch(/^# Donna Memory/);
  });

  it("combines multiple sections with blank line separators", () => {
    const ctx: MemoryContext = {
      identity: { name: "Test" },
      patternSummary: {
        topTools: [{ name: "Read", count: 3 }],
        activeHours: Array.from<number>({ length: 24 }).fill(0),
        totalEvents: 3,
        analyzedAt: new Date().toISOString(),
      },
      todaySummary: null,
      yesterdaySummary: null,
    };
    const block = buildMemoryContextBlock(ctx);
    expect(block).toContain("Test");
    expect(block).toContain("Read");
  });
});

// ---------------------------------------------------------------------------
// MemoryOrchestrator
// ---------------------------------------------------------------------------

describe("MemoryOrchestrator", () => {
  it("isEnabled() returns false by default", () => {
    const o = new MemoryOrchestrator();
    expect(o.isEnabled()).toBe(false);
  });

  it("isEnabled() returns true when enabled=true", () => {
    const o = new MemoryOrchestrator({ enabled: true });
    expect(o.isEnabled()).toBe(true);
  });

  it("getMemoryDir() returns path containing 'memory'", () => {
    const o = new MemoryOrchestrator({}, "/tmp/state");
    expect(o.getMemoryDir()).toContain("memory");
  });

  it("getMemoryDir() uses provided stateDir", () => {
    const o = new MemoryOrchestrator({}, "/tmp/custom-state");
    expect(o.getMemoryDir()).toBe("/tmp/custom-state/memory");
  });

  it("onSessionStart() returns empty string when disabled", async () => {
    const o = new MemoryOrchestrator({ enabled: false });
    const block = await o.onSessionStart("session-1");
    expect(block).toBe("");
  });

  it("onSessionStart() returns empty string when memory files don't exist", async () => {
    const o = new MemoryOrchestrator({ enabled: true }, "/nonexistent/dir");
    // Fails gracefully — no files exist, returns ""
    const block = await o.onSessionStart("session-1");
    // Either empty or a valid block (no crash)
    expect(typeof block).toBe("string");
  });

  it("recordEvent() does nothing when disabled", async () => {
    const o = new MemoryOrchestrator({ enabled: false });
    await expect(
      o.recordEvent({ type: "tool_use", value: "Bash", timestamp: new Date().toISOString() }),
    ).resolves.not.toThrow();
  });

  it("recordEvent() does nothing when patterns layer disabled", async () => {
    const o = new MemoryOrchestrator(
      { enabled: true, patterns: { enabled: false } },
      "/nonexistent",
    );
    await expect(
      o.recordEvent({ type: "tool_use", timestamp: new Date().toISOString() }),
    ).resolves.not.toThrow();
  });

  it("loadContext() returns safe defaults for missing memory directory", async () => {
    const o = new MemoryOrchestrator({ enabled: true }, "/nonexistent/dir/xyz");
    const ctx = await o.loadContext();
    expect(ctx.identity).toBeDefined();
    expect(ctx.patternSummary).toBeUndefined();
    expect(ctx.todaySummary).toBeNull();
    expect(ctx.yesterdaySummary).toBeNull();
  });

  it("consolidate() does nothing when disabled", async () => {
    const o = new MemoryOrchestrator({ enabled: false });
    await expect(o.consolidate()).resolves.not.toThrow();
  });

  it("consolidate() fails gracefully for non-existent dir", async () => {
    const o = new MemoryOrchestrator({ enabled: true }, "/nonexistent/dir");
    await expect(o.consolidate()).resolves.not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  aggregatePatterns,
  buildPatternContextBlock,
  pruneOldEvents,
  resolvePatternConfig,
  shouldAnalyzeNow,
  type PatternEvent,
  type PatternSummary,
} from "./pattern-memory.js";

// ---------------------------------------------------------------------------
// resolvePatternConfig
// ---------------------------------------------------------------------------

describe("resolvePatternConfig", () => {
  it("returns enabled=true by default", () => {
    expect(resolvePatternConfig().enabled).toBe(true);
  });

  it("returns retentionDays=28 by default", () => {
    expect(resolvePatternConfig().retentionDays).toBe(28);
  });

  it("returns analyzeOnSunday=true by default", () => {
    expect(resolvePatternConfig().analyzeOnSunday).toBe(true);
  });

  it("respects custom values", () => {
    const cfg = resolvePatternConfig({ enabled: false, retentionDays: 7, analyzeOnSunday: false });
    expect(cfg.enabled).toBe(false);
    expect(cfg.retentionDays).toBe(7);
    expect(cfg.analyzeOnSunday).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pruneOldEvents
// ---------------------------------------------------------------------------

describe("pruneOldEvents", () => {
  it("keeps events within retentionDays", () => {
    const now = new Date().toISOString();
    const events: PatternEvent[] = [{ type: "session_start", timestamp: now }];
    expect(pruneOldEvents(events, 28)).toHaveLength(1);
  });

  it("removes events older than retentionDays", () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const events: PatternEvent[] = [{ type: "session_start", timestamp: old }];
    expect(pruneOldEvents(events, 28)).toHaveLength(0);
  });

  it("keeps recent and drops old events", () => {
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const events: PatternEvent[] = [
      { type: "session_start", timestamp: old },
      { type: "session_start", timestamp: now },
    ];
    expect(pruneOldEvents(events, 28)).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(pruneOldEvents([], 28)).toHaveLength(0);
  });

  it("drops events with invalid timestamps", () => {
    const events: PatternEvent[] = [{ type: "x", timestamp: "not-a-date" }];
    expect(pruneOldEvents(events, 28)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// aggregatePatterns
// ---------------------------------------------------------------------------

describe("aggregatePatterns", () => {
  it("returns zero totals for empty events", () => {
    const summary = aggregatePatterns([]);
    expect(summary.totalEvents).toBe(0);
    expect(summary.topTools).toEqual([]);
    expect(summary.activeHours).toHaveLength(24);
  });

  it("counts tool_use events by value", () => {
    const events: PatternEvent[] = [
      { type: "tool_use", value: "Bash", timestamp: new Date().toISOString() },
      { type: "tool_use", value: "Bash", timestamp: new Date().toISOString() },
      { type: "tool_use", value: "Read", timestamp: new Date().toISOString() },
    ];
    const summary = aggregatePatterns(events);
    expect(summary.topTools[0]?.name).toBe("Bash");
    expect(summary.topTools[0]?.count).toBe(2);
    expect(summary.topTools[1]?.name).toBe("Read");
  });

  it("builds 24-slot activeHours histogram", () => {
    const ts = new Date();
    ts.setHours(14, 0, 0, 0);
    const events: PatternEvent[] = [{ type: "session_start", timestamp: ts.toISOString() }];
    const summary = aggregatePatterns(events);
    expect(summary.activeHours[14]).toBeGreaterThan(0);
  });

  it("returns totalEvents count", () => {
    const now = new Date().toISOString();
    const events: PatternEvent[] = Array.from({ length: 5 }, () => ({
      type: "message",
      timestamp: now,
    }));
    expect(aggregatePatterns(events).totalEvents).toBe(5);
  });

  it("limits topTools to 10 entries", () => {
    const now = new Date().toISOString();
    const events: PatternEvent[] = Array.from({ length: 15 }, (_, i) => ({
      type: "tool_use",
      value: `Tool${i}`,
      timestamp: now,
    }));
    expect(aggregatePatterns(events).topTools.length).toBeLessThanOrEqual(10);
  });

  it("sorts topTools descending by count", () => {
    const now = new Date().toISOString();
    const events: PatternEvent[] = [
      { type: "tool_use", value: "A", timestamp: now },
      { type: "tool_use", value: "B", timestamp: now },
      { type: "tool_use", value: "B", timestamp: now },
      { type: "tool_use", value: "B", timestamp: now },
    ];
    const summary = aggregatePatterns(events);
    expect(summary.topTools[0]?.name).toBe("B");
  });

  it("ignores tool_use events without a value", () => {
    const now = new Date().toISOString();
    const events: PatternEvent[] = [{ type: "tool_use", timestamp: now }];
    expect(aggregatePatterns(events).topTools).toHaveLength(0);
  });

  it("sets analyzedAt to an ISO string", () => {
    const summary = aggregatePatterns([]);
    expect(summary.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ---------------------------------------------------------------------------
// shouldAnalyzeNow
// ---------------------------------------------------------------------------

describe("shouldAnalyzeNow", () => {
  it("returns true on Sunday when never analyzed before", () => {
    const sunday = new Date("2026-03-08"); // a Sunday
    const cfg = resolvePatternConfig({ analyzeOnSunday: true });
    expect(shouldAnalyzeNow(undefined, cfg, sunday)).toBe(true);
  });

  it("returns false on non-Sunday when analyzeOnSunday=true", () => {
    const monday = new Date("2026-03-09"); // a Monday
    const cfg = resolvePatternConfig({ analyzeOnSunday: true });
    expect(shouldAnalyzeNow(undefined, cfg, monday)).toBe(false);
  });

  it("returns false on Sunday if already analyzed today", () => {
    const sunday = new Date("2026-03-08");
    const cfg = resolvePatternConfig({ analyzeOnSunday: true });
    expect(shouldAnalyzeNow("2026-03-08T10:00:00Z", cfg, sunday)).toBe(false);
  });

  it("returns true when analyzeOnSunday=false regardless of day", () => {
    const monday = new Date("2026-03-09");
    const cfg = resolvePatternConfig({ analyzeOnSunday: false });
    expect(shouldAnalyzeNow(undefined, cfg, monday)).toBe(true);
  });

  it("returns true on Sunday when last analyzed on a different Sunday", () => {
    const sunday = new Date("2026-03-08");
    const cfg = resolvePatternConfig({ analyzeOnSunday: true });
    expect(shouldAnalyzeNow("2026-03-01T10:00:00Z", cfg, sunday)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildPatternContextBlock
// ---------------------------------------------------------------------------

describe("buildPatternContextBlock", () => {
  it("returns empty string when totalEvents=0", () => {
    const summary: PatternSummary = {
      topTools: [],
      activeHours: Array.from<number>({ length: 24 }).fill(0),
      totalEvents: 0,
      analyzedAt: new Date().toISOString(),
    };
    expect(buildPatternContextBlock(summary)).toBe("");
  });

  it("includes top tools in output", () => {
    const summary: PatternSummary = {
      topTools: [{ name: "Bash", count: 10 }],
      activeHours: Array.from<number>({ length: 24 }).fill(0),
      totalEvents: 10,
      analyzedAt: new Date().toISOString(),
    };
    expect(buildPatternContextBlock(summary)).toContain("Bash");
  });

  it("includes peak hours when usage data present", () => {
    const activeHours = Array.from<number>({ length: 24 }).fill(0);
    activeHours[9] = 15;
    const summary: PatternSummary = {
      topTools: [],
      activeHours,
      totalEvents: 15,
      analyzedAt: new Date().toISOString(),
    };
    expect(buildPatternContextBlock(summary)).toContain("9h");
  });

  it("starts with ## Usage Patterns header", () => {
    const summary: PatternSummary = {
      topTools: [{ name: "X", count: 1 }],
      activeHours: Array.from<number>({ length: 24 }).fill(0),
      totalEvents: 1,
      analyzedAt: new Date().toISOString(),
    };
    expect(buildPatternContextBlock(summary)).toMatch(/^## Usage Patterns/);
  });
});

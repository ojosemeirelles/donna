import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import type { ShadowExecution } from "./types.js";

// Use a temp dir for each test run to avoid polluting the real history
let tempDir: string;

function makeExecution(overrides: Partial<ShadowExecution> = {}): ShadowExecution {
  return {
    id: `exec-${Math.random().toString(36).slice(2, 8)}`,
    shadowName: "Igris",
    intent: "complex",
    parentSessionId: "parent-1",
    startedAt: Date.now(),
    durationMs: 500,
    tokenUsage: { input: 100, output: 50 },
    status: "completed",
    ...overrides,
  };
}

describe("tracker", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "donna-shadow-tracker-"));
    vi.stubEnv("DONNA_SHADOW_HISTORY_PATH", join(tempDir, "history.jsonl"));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("records and reads back executions", async () => {
    // Dynamic import to pick up env after stubbing
    const { record, readAllRecords } = await import("./tracker.js");

    const exec1 = makeExecution({ shadowName: "Igris" });
    const exec2 = makeExecution({ shadowName: "Beru", intent: "exec" });

    await record(exec1);
    await record(exec2);

    const records = await readAllRecords();
    expect(records).toHaveLength(2);
    expect(records[0].shadowName).toBe("Igris");
    expect(records[1].shadowName).toBe("Beru");
  });

  it("readAllRecords returns empty array when file missing", async () => {
    vi.stubEnv("DONNA_SHADOW_HISTORY_PATH", join(tempDir, "nonexistent.jsonl"));
    const { readAllRecords } = await import("./tracker.js");

    const records = await readAllRecords();
    expect(records).toEqual([]);
  });

  it("getHistory filters by shadow name", async () => {
    const { record, getHistory } = await import("./tracker.js");

    await record(makeExecution({ shadowName: "Igris" }));
    await record(makeExecution({ shadowName: "Beru" }));
    await record(makeExecution({ shadowName: "Igris" }));

    const history = await getHistory("Igris");
    expect(history).toHaveLength(2);
    expect(history.every((r) => r.shadowName === "Igris")).toBe(true);
  });

  it("getHistory respects limit parameter", async () => {
    const { record, getHistory } = await import("./tracker.js");

    for (let i = 0; i < 5; i++) {
      await record(makeExecution({ shadowName: "Igris", id: `exec-${i}` }));
    }

    const history = await getHistory("Igris", 2);
    expect(history).toHaveLength(2);
  });

  it("getHistory is case-insensitive", async () => {
    const { record, getHistory } = await import("./tracker.js");

    await record(makeExecution({ shadowName: "Igris" }));

    const history = await getHistory("igris");
    expect(history).toHaveLength(1);
  });

  it("getSummary aggregates stats correctly", async () => {
    const { record, getSummary } = await import("./tracker.js");

    await record(makeExecution({ shadowName: "Igris", intent: "complex", tokenUsage: { input: 100, output: 50 } }));
    await record(makeExecution({ shadowName: "Igris", intent: "complex", status: "failed", tokenUsage: { input: 80, output: 20 } }));
    await record(makeExecution({ shadowName: "Beru", intent: "exec", tokenUsage: { input: 200, output: 100 } }));

    const summary = await getSummary();

    expect(summary.totalExecutions).toBe(3);
    expect(summary.byShadow["Igris"].count).toBe(2);
    expect(summary.byShadow["Igris"].failures).toBe(1);
    expect(summary.byShadow["Beru"].count).toBe(1);
    expect(summary.byIntent["complex"]).toBe(2);
    expect(summary.byIntent["exec"]).toBe(1);
    expect(summary.byStatus["completed"]).toBe(2);
    expect(summary.byStatus["failed"]).toBe(1);
    expect(summary.totalTokens.input).toBe(380);
    expect(summary.totalTokens.output).toBe(170);
  });

  it("pruneOldRecords removes records past retention", async () => {
    vi.stubEnv("DONNA_SHADOW_HISTORY_RETENTION_DAYS", "1");
    const { record, pruneOldRecords, readAllRecords } = await import("./tracker.js");

    const oldExec = makeExecution({
      startedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    });
    const recentExec = makeExecution({
      startedAt: Date.now(),
    });

    await record(oldExec);
    await record(recentExec);

    const pruned = await pruneOldRecords();
    expect(pruned).toBe(1);

    const remaining = await readAllRecords();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(recentExec.id);
  });

  it("pruneOldRecords does nothing when all records are fresh", async () => {
    vi.stubEnv("DONNA_SHADOW_HISTORY_RETENTION_DAYS", "7");
    const { record, pruneOldRecords, readAllRecords } = await import("./tracker.js");

    await record(makeExecution());
    await record(makeExecution());

    const pruned = await pruneOldRecords();
    expect(pruned).toBe(0);

    const remaining = await readAllRecords();
    expect(remaining).toHaveLength(2);
  });

  it("skips malformed JSONL lines gracefully", async () => {
    const { readAllRecords } = await import("./tracker.js");
    const historyPath = join(tempDir, "history.jsonl");
    const { writeFile } = await import("node:fs/promises");

    const validExec = makeExecution();
    const content = `${JSON.stringify(validExec)}\n{malformed json}\n${JSON.stringify(makeExecution())}\n`;
    await writeFile(historyPath, content, "utf-8");

    const records = await readAllRecords();
    expect(records).toHaveLength(2); // skips the malformed line
  });
});

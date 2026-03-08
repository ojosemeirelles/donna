import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportMemory, importMemory, parseBackup, type MemoryBackup } from "./backup.js";
import {
  appendEpisodeEntry,
  loadEpisode,
  loadEpisodeSummary,
  saveEpisodeSummary,
} from "./episodic-memory.js";
import { loadIdentity, saveIdentity } from "./identity-memory.js";
import { loadPatternStore, savePatternStore } from "./pattern-memory.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "donna-backup-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parseBackup
// ---------------------------------------------------------------------------

describe("parseBackup", () => {
  it("parses a valid backup", () => {
    const backup: MemoryBackup = {
      meta: {
        version: 1,
        exportedAt: "2026-03-08T00:00:00Z",
        memoryDir: "/tmp/memory",
      },
      identity: { name: "Jose" },
      patterns: { events: [] },
      episodes: [],
      summaries: [],
    };
    const result = parseBackup(JSON.stringify(backup));
    expect(result.meta.version).toBe(1);
    expect(result.identity.name).toBe("Jose");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseBackup("not json")).toThrow("not valid JSON");
  });

  it("throws on non-object JSON", () => {
    expect(() => parseBackup('"a string"')).toThrow("invalid structure");
  });

  it("throws on missing meta", () => {
    expect(() => parseBackup(JSON.stringify({ identity: {} }))).toThrow("missing 'meta'");
  });

  it("throws on future version", () => {
    const backup = {
      meta: { version: 999, exportedAt: "", memoryDir: "" },
      identity: {},
      patterns: { events: [] },
      episodes: [],
      summaries: [],
    };
    expect(() => parseBackup(JSON.stringify(backup))).toThrow("newer than supported");
  });

  it("handles missing optional sections gracefully", () => {
    const backup = { meta: { version: 1, exportedAt: "", memoryDir: "" } };
    const result = parseBackup(JSON.stringify(backup));
    expect(result.identity).toEqual({});
    expect(result.patterns).toEqual({ events: [] });
    expect(result.episodes).toEqual([]);
    expect(result.summaries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Roundtrip: export -> wipe -> import -> verify
// ---------------------------------------------------------------------------

describe("export/import roundtrip", () => {
  it("preserves identity, patterns, episodes, and summaries", async () => {
    const memoryDir = path.join(tmpDir, "memory");
    const outputPath = path.join(tmpDir, "backup.json");
    const restoreDir = path.join(tmpDir, "restored");

    // Seed identity
    await saveIdentity(memoryDir, {
      name: "Jose",
      preferredLanguage: "pt",
      expertise: ["typescript", "ai"],
    });

    // Seed patterns
    await savePatternStore(memoryDir, {
      events: [
        { type: "tool_use", value: "bash", timestamp: "2026-03-08T10:00:00Z" },
        { type: "session_start", value: "s1", timestamp: "2026-03-08T09:00:00Z" },
      ],
      summary: {
        topTools: [{ name: "bash", count: 1 }],
        activeHours: Array.from({ length: 24 }).fill(0) as number[],
        totalEvents: 2,
        analyzedAt: "2026-03-08T12:00:00Z",
      },
    });

    // Seed episode
    await appendEpisodeEntry(memoryDir, "2026-03-08", {
      timestamp: "2026-03-08T10:00:00Z",
      type: "message",
      content: "hello from test",
    });

    // Seed summary
    await saveEpisodeSummary(memoryDir, "2026-03-08", {
      date: "2026-03-08",
      summary: "Test session summary",
      keyTopics: ["testing"],
      createdAt: "2026-03-08T12:00:00Z",
    });

    // Export
    const exported = await exportMemory(memoryDir, outputPath, "test-agent");
    expect(exported.meta.version).toBe(1);
    expect(exported.identity.name).toBe("Jose");
    expect(exported.patterns.events).toHaveLength(2);
    expect(exported.episodes).toHaveLength(1);
    expect(exported.summaries).toHaveLength(1);

    // Verify file exists on disk
    const raw = await fs.readFile(outputPath, "utf-8");
    expect(JSON.parse(raw).meta.agentId).toBe("test-agent");

    // Import into fresh directory
    const imported = await importMemory(outputPath, restoreDir);
    expect(imported.meta.agentId).toBe("test-agent");

    // Verify restored data
    const restoredIdentity = await loadIdentity(restoreDir);
    expect(restoredIdentity.name).toBe("Jose");
    expect(restoredIdentity.expertise).toEqual(["typescript", "ai"]);

    const restoredPatterns = await loadPatternStore(restoreDir);
    expect(restoredPatterns.events).toHaveLength(2);
    expect(restoredPatterns.summary?.topTools[0]?.name).toBe("bash");

    const restoredEpisode = await loadEpisode(restoreDir, "2026-03-08");
    expect(restoredEpisode.entries).toHaveLength(1);
    expect(restoredEpisode.entries[0]?.content).toBe("hello from test");

    const restoredSummary = await loadEpisodeSummary(restoreDir, "2026-03-08");
    expect(restoredSummary?.summary).toBe("Test session summary");
  });
});

// ---------------------------------------------------------------------------
// Empty database
// ---------------------------------------------------------------------------

describe("export with empty memory", () => {
  it("exports empty backup without errors", async () => {
    const memoryDir = path.join(tmpDir, "empty-memory");
    const outputPath = path.join(tmpDir, "empty-backup.json");

    // memoryDir doesn't exist yet - should still work
    const exported = await exportMemory(memoryDir, outputPath);
    expect(exported.identity).toEqual({});
    expect(exported.patterns.events).toEqual([]);
    expect(exported.episodes).toEqual([]);
    expect(exported.summaries).toEqual([]);

    // Import into fresh dir should not throw
    const restoreDir = path.join(tmpDir, "restored-empty");
    const imported = await importMemory(outputPath, restoreDir);
    expect(imported.episodes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Error handling: corrupted input
// ---------------------------------------------------------------------------

describe("import with corrupted file", () => {
  it("throws on non-JSON file", async () => {
    const badFile = path.join(tmpDir, "bad.json");
    await fs.writeFile(badFile, "this is not json", "utf-8");
    const restoreDir = path.join(tmpDir, "restore-bad");
    await expect(importMemory(badFile, restoreDir)).rejects.toThrow("not valid JSON");
  });

  it("throws on missing meta", async () => {
    const badFile = path.join(tmpDir, "no-meta.json");
    await fs.writeFile(badFile, JSON.stringify({ identity: {} }), "utf-8");
    const restoreDir = path.join(tmpDir, "restore-no-meta");
    await expect(importMemory(badFile, restoreDir)).rejects.toThrow("missing 'meta'");
  });

  it("throws on file not found", async () => {
    const missing = path.join(tmpDir, "does-not-exist.json");
    const restoreDir = path.join(tmpDir, "restore-missing");
    await expect(importMemory(missing, restoreDir)).rejects.toThrow();
  });
});

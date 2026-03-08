import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupSessions } from "./cleanup.js";

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "donna-cleanup-test-"));
}

function writeFile(dir: string, name: string, content = "test"): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function setMtime(filePath: string, daysAgo: number): void {
  const mtime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  fs.utimesSync(filePath, mtime, mtime);
}

describe("cleanupSessions", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes transcript files older than maxAgeDays", async () => {
    const old = writeFile(tmpDir, "old-session.jsonl", "old data");
    setMtime(old, 45);
    const recent = writeFile(tmpDir, "recent-session.jsonl", "recent data");
    setMtime(recent, 5);

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30 });

    expect(result.deletedCount).toBe(1);
    expect(result.keptCount).toBe(1);
    expect(result.freedBytes).toBeGreaterThan(0);
    expect(result.deletedPaths).toEqual([old]);
    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(recent)).toBe(true);
  });

  it("caps file count when over maxCount", async () => {
    // Create 5 files, keep only 3.
    const files: string[] = [];
    for (let i = 0; i < 5; i++) {
      const f = writeFile(tmpDir, `session-${i}.jsonl`, `data-${i}`);
      setMtime(f, 10 - i); // oldest first
      files.push(f);
    }

    const result = await cleanupSessions(tmpDir, { maxCount: 3, maxAgeDays: 30 });

    expect(result.deletedCount).toBe(2);
    expect(result.keptCount).toBe(3);
    // The two oldest files should have been removed.
    expect(fs.existsSync(files[0]!)).toBe(false);
    expect(fs.existsSync(files[1]!)).toBe(false);
    expect(fs.existsSync(files[2]!)).toBe(true);
    expect(fs.existsSync(files[3]!)).toBe(true);
    expect(fs.existsSync(files[4]!)).toBe(true);
  });

  it("dry run reports deletions without deleting files", async () => {
    const old = writeFile(tmpDir, "old-session.jsonl", "old data");
    setMtime(old, 45);
    const recent = writeFile(tmpDir, "recent-session.jsonl", "recent data");
    setMtime(recent, 5);

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30, dryRun: true });

    expect(result.deletedCount).toBe(1);
    expect(result.deletedPaths).toEqual([old]);
    // File should still exist in dry-run mode.
    expect(fs.existsSync(old)).toBe(true);
    expect(fs.existsSync(recent)).toBe(true);
  });

  it("handles empty directory", async () => {
    const result = await cleanupSessions(tmpDir);

    expect(result.deletedCount).toBe(0);
    expect(result.freedBytes).toBe(0);
    expect(result.keptCount).toBe(0);
    expect(result.deletedPaths).toEqual([]);
  });

  it("handles non-existent directory", async () => {
    const result = await cleanupSessions(path.join(tmpDir, "nonexistent"));

    expect(result.deletedCount).toBe(0);
    expect(result.freedBytes).toBe(0);
    expect(result.keptCount).toBe(0);
    expect(result.deletedPaths).toEqual([]);
  });

  it("does not delete sessions.json or its backups", async () => {
    const sessionsJson = writeFile(tmpDir, "sessions.json", '{"key": {}}');
    setMtime(sessionsJson, 60);
    const backup = writeFile(tmpDir, "sessions.json.bak.12345", "backup");
    setMtime(backup, 60);
    const transcript = writeFile(tmpDir, "old-transcript.jsonl", "data");
    setMtime(transcript, 45);

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30 });

    expect(result.deletedCount).toBe(1);
    expect(fs.existsSync(sessionsJson)).toBe(true);
    expect(fs.existsSync(backup)).toBe(true);
    expect(fs.existsSync(transcript)).toBe(false);
  });

  it("keeps all files when none are expired", async () => {
    writeFile(tmpDir, "a.jsonl", "data-a");
    setMtime(path.join(tmpDir, "a.jsonl"), 5);
    writeFile(tmpDir, "b.jsonl", "data-b");
    setMtime(path.join(tmpDir, "b.jsonl"), 10);

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30, maxCount: 1000 });

    expect(result.deletedCount).toBe(0);
    expect(result.keptCount).toBe(2);
  });

  it("combines TTL and count cap", async () => {
    // 2 old (will be TTL-pruned), 4 recent (only 2 allowed by cap).
    const oldA = writeFile(tmpDir, "old-a.jsonl", "a");
    setMtime(oldA, 40);
    const oldB = writeFile(tmpDir, "old-b.jsonl", "b");
    setMtime(oldB, 35);

    const recentFiles: string[] = [];
    for (let i = 0; i < 4; i++) {
      const f = writeFile(tmpDir, `recent-${i}.jsonl`, `r-${i}`);
      setMtime(f, 10 - i);
      recentFiles.push(f);
    }

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30, maxCount: 2 });

    // 2 TTL + 2 count cap = 4 deleted.
    expect(result.deletedCount).toBe(4);
    expect(result.keptCount).toBe(2);
    expect(fs.existsSync(oldA)).toBe(false);
    expect(fs.existsSync(oldB)).toBe(false);
    // The two most recent should survive.
    expect(fs.existsSync(recentFiles[2]!)).toBe(true);
    expect(fs.existsSync(recentFiles[3]!)).toBe(true);
  });

  it("ignores non-jsonl files", async () => {
    writeFile(tmpDir, "notes.txt", "not a transcript");
    setMtime(path.join(tmpDir, "notes.txt"), 60);
    writeFile(tmpDir, "data.json", '{"key": "value"}');
    setMtime(path.join(tmpDir, "data.json"), 60);

    const result = await cleanupSessions(tmpDir, { maxAgeDays: 30 });

    expect(result.deletedCount).toBe(0);
    expect(result.keptCount).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, "notes.txt"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "data.json"))).toBe(true);
  });
});

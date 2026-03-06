import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  restoreStateDirEnv,
  setStateDirEnv,
  snapshotStateDirEnv,
  withStateDirEnv,
} from "./state-dir-env.js";

async function expectPathMissing(filePath: string) {
  await expect(fs.stat(filePath)).rejects.toThrow();
}

describe("state-dir-env helpers", () => {
  it("set/snapshot/restore round-trips DONNA_STATE_DIR", () => {
    const prev = process.env.DONNA_STATE_DIR;
    const snapshot = snapshotStateDirEnv();

    setStateDirEnv("/tmp/donna-state-dir-test");
    expect(process.env.DONNA_STATE_DIR).toBe("/tmp/donna-state-dir-test");

    restoreStateDirEnv(snapshot);
    expect(process.env.DONNA_STATE_DIR).toBe(prev);
  });

  it("withStateDirEnv sets env for callback and cleans up temp root", async () => {
    const prev = process.env.DONNA_STATE_DIR;

    let capturedTempRoot = "";
    let capturedStateDir = "";
    await withStateDirEnv("donna-state-dir-env-", async ({ tempRoot, stateDir }) => {
      capturedTempRoot = tempRoot;
      capturedStateDir = stateDir;
      expect(process.env.DONNA_STATE_DIR).toBe(stateDir);
      await fs.writeFile(path.join(stateDir, "probe.txt"), "ok", "utf8");
    });

    expect(process.env.DONNA_STATE_DIR).toBe(prev);
    await expectPathMissing(capturedStateDir);
    await expectPathMissing(capturedTempRoot);
  });

  it("withStateDirEnv restores env and cleans temp root when callback throws", async () => {
    const prev = process.env.DONNA_STATE_DIR;

    let capturedTempRoot = "";
    let capturedStateDir = "";
    await expect(
      withStateDirEnv("donna-state-dir-env-", async ({ tempRoot, stateDir }) => {
        capturedTempRoot = tempRoot;
        capturedStateDir = stateDir;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(process.env.DONNA_STATE_DIR).toBe(prev);
    await expectPathMissing(capturedStateDir);
    await expectPathMissing(capturedTempRoot);
  });

  it("withStateDirEnv restores DONNA_STATE_DIR when it was previously set", async () => {
    const testSnapshot = snapshotStateDirEnv();
    process.env.DONNA_STATE_DIR = "/tmp/original-donna";
    const prev = process.env.DONNA_STATE_DIR;

    let capturedTempRoot = "";
    let capturedStateDir = "";
    try {
      await withStateDirEnv("donna-state-dir-env-", async ({ tempRoot, stateDir }) => {
        capturedTempRoot = tempRoot;
        capturedStateDir = stateDir;
        expect(process.env.DONNA_STATE_DIR).toBe(stateDir);
      });

      expect(process.env.DONNA_STATE_DIR).toBe(prev);
      await expectPathMissing(capturedStateDir);
      await expectPathMissing(capturedTempRoot);
    } finally {
      restoreStateDirEnv(testSnapshot);
    }
  });
});

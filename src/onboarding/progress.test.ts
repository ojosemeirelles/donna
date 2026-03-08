import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadProgress,
  saveProgress,
  completeStep,
  uncompleteStep,
  resetProgress,
  isStepCompleted,
  getNextIncompleteStep,
  getNextRequiredStep,
  isProgressComplete,
  progressPercent,
  type OnboardingProgressData,
} from "./progress.js";

// ---------------------------------------------------------------------------
// Test setup — use a temp directory as DONNA_STATE_DIR so we don't touch
// the real ~/.donna during tests.
// ---------------------------------------------------------------------------

let tmpDir: string;
let testEnv: NodeJS.ProcessEnv;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "donna-onboarding-test-"));
  testEnv = { ...process.env, DONNA_STATE_DIR: tmpDir };
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("loadProgress", () => {
  it("returns default progress when no file exists", async () => {
    const progress = await loadProgress(testEnv);
    expect(progress.completedSteps).toEqual([]);
    expect(progress.startedAt).toBeTruthy();
    expect(progress.updatedAt).toBeTruthy();
  });

  it("returns saved data when file exists", async () => {
    const data: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await fs.writeFile(
      path.join(tmpDir, "onboarding.json"),
      JSON.stringify(data),
    );
    const progress = await loadProgress(testEnv);
    expect(progress.completedSteps).toEqual(["config"]);
  });

  it("returns default for invalid JSON", async () => {
    await fs.writeFile(path.join(tmpDir, "onboarding.json"), "not json");
    const progress = await loadProgress(testEnv);
    expect(progress.completedSteps).toEqual([]);
  });
});

describe("saveProgress", () => {
  it("writes progress to disk", async () => {
    const data: OnboardingProgressData = {
      completedSteps: ["config", "gateway"],
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await saveProgress(data, testEnv);
    const raw = await fs.readFile(path.join(tmpDir, "onboarding.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.completedSteps).toEqual(["config", "gateway"]);
    // updatedAt should be refreshed
    expect(parsed.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("completeStep", () => {
  it("adds a step to completedSteps", async () => {
    const progress = await completeStep("config", testEnv);
    expect(progress.completedSteps).toContain("config");
  });

  it("does not duplicate an already completed step", async () => {
    await completeStep("config", testEnv);
    const progress = await completeStep("config", testEnv);
    expect(progress.completedSteps.filter((s) => s === "config")).toHaveLength(1);
  });

  it("persists to disk", async () => {
    await completeStep("gateway", testEnv);
    const loaded = await loadProgress(testEnv);
    expect(loaded.completedSteps).toContain("gateway");
  });
});

describe("uncompleteStep", () => {
  it("removes a step from completedSteps", async () => {
    await completeStep("config", testEnv);
    const progress = await uncompleteStep("config", testEnv);
    expect(progress.completedSteps).not.toContain("config");
  });

  it("is a no-op for a step that was never completed", async () => {
    const progress = await uncompleteStep("config", testEnv);
    expect(progress.completedSteps).toEqual([]);
  });
});

describe("resetProgress", () => {
  it("clears all completed steps", async () => {
    await completeStep("config", testEnv);
    await completeStep("gateway", testEnv);
    const progress = await resetProgress(testEnv);
    expect(progress.completedSteps).toEqual([]);
  });
});

describe("isStepCompleted", () => {
  it("returns true for a completed step", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "",
      updatedAt: "",
    };
    expect(isStepCompleted(progress, "config")).toBe(true);
  });

  it("returns false for an incomplete step", () => {
    const progress: OnboardingProgressData = {
      completedSteps: [],
      startedAt: "",
      updatedAt: "",
    };
    expect(isStepCompleted(progress, "config")).toBe(false);
  });
});

describe("getNextIncompleteStep", () => {
  it("returns the first step when nothing is complete", () => {
    const progress: OnboardingProgressData = {
      completedSteps: [],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextIncompleteStep(progress)).toBe("config");
  });

  it("skips completed steps", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextIncompleteStep(progress)).toBe("gateway");
  });

  it("returns undefined when all steps are complete", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config", "gateway", "channel", "test-message", "done"],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextIncompleteStep(progress)).toBeUndefined();
  });
});

describe("getNextRequiredStep", () => {
  it("returns the first required step", () => {
    const progress: OnboardingProgressData = {
      completedSteps: [],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextRequiredStep(progress)).toBe("config");
  });

  it("skips to gateway when config is done", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextRequiredStep(progress)).toBe("gateway");
  });

  it("returns undefined when all required steps are done", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config", "gateway"],
      startedAt: "",
      updatedAt: "",
    };
    expect(getNextRequiredStep(progress)).toBeUndefined();
  });
});

describe("isProgressComplete", () => {
  it("returns false when required steps are incomplete", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "",
      updatedAt: "",
    };
    expect(isProgressComplete(progress)).toBe(false);
  });

  it("returns true when all required steps are complete", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config", "gateway"],
      startedAt: "",
      updatedAt: "",
    };
    expect(isProgressComplete(progress)).toBe(true);
  });
});

describe("progressPercent", () => {
  it("returns 0 when no required steps are done", () => {
    const progress: OnboardingProgressData = {
      completedSteps: [],
      startedAt: "",
      updatedAt: "",
    };
    expect(progressPercent(progress)).toBe(0);
  });

  it("returns 50 when 1 of 2 required steps is done", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config"],
      startedAt: "",
      updatedAt: "",
    };
    expect(progressPercent(progress)).toBe(50);
  });

  it("returns 100 when all required steps are done", () => {
    const progress: OnboardingProgressData = {
      completedSteps: ["config", "gateway"],
      startedAt: "",
      updatedAt: "",
    };
    expect(progressPercent(progress)).toBe(100);
  });
});

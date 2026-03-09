import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { EvolutionTracker, XP_REWARDS } from "./tracker.js";

function tmpPath() {
  return join(
    tmpdir(),
    `donna-test-evolution-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
}

describe("evolution/tracker", () => {
  let tracker: EvolutionTracker;

  beforeEach(() => {
    tracker = new EvolutionTracker(tmpPath());
  });

  it("starts at level 1 with zero XP", () => {
    const state = tracker.getState();
    expect(state.level).toBe(1);
    expect(state.stats.xp).toBe(0);
    expect(state.stats.totalInteractions).toBe(0);
  });

  it("recordInteraction awards XP", () => {
    tracker.recordInteraction();
    const state = tracker.getState();
    expect(state.stats.totalInteractions).toBe(1);
    // First interaction: dailyLogin(3) + streakBonus(1) + message(2) = 6
    expect(state.stats.xp).toBe(
      XP_REWARDS.dailyLogin + XP_REWARDS.streakBonus(1) + XP_REWARDS.message,
    );
  });

  it("second interaction same day only gets message XP", () => {
    tracker.recordInteraction();
    const xpAfterFirst = tracker.getState().stats.xp;
    tracker.recordInteraction();
    expect(tracker.getState().stats.xp).toBe(xpAfterFirst + XP_REWARDS.message);
  });

  it("recordTaskCompleted awards XP", () => {
    tracker.recordTaskCompleted();
    expect(tracker.getState().stats.tasksCompleted).toBe(1);
    expect(tracker.getState().stats.xp).toBe(XP_REWARDS.taskCompleted);
  });

  it("recordErrorResolved awards XP", () => {
    tracker.recordErrorResolved();
    expect(tracker.getState().stats.errorsResolved).toBe(1);
    expect(tracker.getState().stats.xp).toBe(XP_REWARDS.errorResolved);
  });

  it("recordSkillUsed awards XP only for new skills", () => {
    const xp1 = tracker.recordSkillUsed("web-search");
    expect(xp1).toBe(XP_REWARDS.skillUsed);
    const xp2 = tracker.recordSkillUsed("web-search"); // duplicate
    expect(xp2).toBe(0);
    expect(tracker.getState().stats.skillsUsed).toEqual(["web-search"]);
  });

  it("persists and loads state with XP", async () => {
    const p = tmpPath();
    const t1 = new EvolutionTracker(p);
    t1.recordInteraction();
    t1.recordTaskCompleted();
    await t1.save();

    const t2 = new EvolutionTracker(p);
    await t2.load();
    expect(t2.getState().stats.xp).toBeGreaterThan(0);
    expect(t2.getState().stats.tasksCompleted).toBe(1);
  });

  it("load returns false if no file", async () => {
    expect(await tracker.load()).toBe(false);
  });

  it("setLevel records history", () => {
    tracker.setLevel(2, 1);
    const state = tracker.getState();
    expect(state.level).toBe(2);
    expect(state.levelUpHistory).toHaveLength(1);
  });

  it("shouldAutoSave after 10 interactions", () => {
    expect(tracker.shouldAutoSave()).toBe(false);
    for (let i = 0; i < 10; i++) {
      tracker.recordInteraction();
    }
    expect(tracker.shouldAutoSave()).toBe(true);
  });

  it("migrates old format without XP fields", async () => {
    const p = tmpPath();
    // Write old format
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(p), { recursive: true });
    await writeFile(
      p,
      JSON.stringify({
        level: 2,
        stats: {
          totalInteractions: 50,
          daysActive: 10,
          skillsUsed: ["search"],
          firstSeenAt: "2026-01-01T00:00:00Z",
          lastSeenAt: "2026-01-10T00:00:00Z",
          activeDays: [],
        },
        levelUpHistory: [],
      }),
    );

    const t = new EvolutionTracker(p);
    await t.load();
    const state = t.getState();
    expect(state.stats.xp).toBe(0);
    expect(state.stats.tasksCompleted).toBe(0);
    expect(state.stats.totalInteractions).toBe(50);
  });
});

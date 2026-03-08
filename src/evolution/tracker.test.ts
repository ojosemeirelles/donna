import { describe, expect, it, beforeEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EvolutionTracker } from "./tracker.js";

function tmpPath() {
  return join(tmpdir(), `donna-test-evolution-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("evolution/tracker", () => {
  let tracker: EvolutionTracker;

  beforeEach(() => {
    tracker = new EvolutionTracker(tmpPath());
  });

  it("starts at level 1 with zero interactions", () => {
    const state = tracker.getState();
    expect(state.level).toBe(1);
    expect(state.stats.totalInteractions).toBe(0);
    expect(state.stats.daysActive).toBe(0);
  });

  it("records interactions", () => {
    tracker.recordInteraction();
    tracker.recordInteraction();
    tracker.recordInteraction();
    expect(tracker.getState().stats.totalInteractions).toBe(3);
  });

  it("counts unique active days", () => {
    tracker.recordInteraction();
    tracker.recordInteraction(); // same day
    expect(tracker.getState().stats.daysActive).toBe(1);
    expect(tracker.getState().stats.activeDays).toHaveLength(1);
  });

  it("records skills used (unique)", () => {
    tracker.recordSkillUsed("web-search");
    tracker.recordSkillUsed("code-gen");
    tracker.recordSkillUsed("web-search"); // duplicate
    expect(tracker.getState().stats.skillsUsed).toEqual(["web-search", "code-gen"]);
  });

  it("persists and loads state", async () => {
    const path = tmpPath();
    const t1 = new EvolutionTracker(path);
    t1.recordInteraction();
    t1.recordInteraction();
    t1.recordSkillUsed("search");
    await t1.save();

    const t2 = new EvolutionTracker(path);
    const loaded = await t2.load();
    expect(loaded).toBe(true);
    expect(t2.getState().stats.totalInteractions).toBe(2);
    expect(t2.getState().stats.skillsUsed).toEqual(["search"]);
  });

  it("load returns false if no file", async () => {
    const result = await tracker.load();
    expect(result).toBe(false);
  });

  it("setLevel records history", () => {
    tracker.setLevel(2, 1);
    const state = tracker.getState();
    expect(state.level).toBe(2);
    expect(state.levelUpHistory).toHaveLength(1);
    expect(state.levelUpHistory[0]!.from).toBe(1);
    expect(state.levelUpHistory[0]!.to).toBe(2);
  });
});

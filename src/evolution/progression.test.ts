import { describe, expect, it } from "vitest";
import { evaluateProgression, meetsCriteria, formatLevelUpMessage } from "./progression.js";
import type { EvolutionStats } from "./tracker.js";

function makeStats(overrides: Partial<EvolutionStats> = {}): EvolutionStats {
  return {
    totalInteractions: 0,
    daysActive: 0,
    skillsUsed: [],
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    activeDays: [],
    xp: 0,
    tasksCompleted: 0,
    errorsResolved: 0,
    uptimeHours: 0,
    streakDays: 0,
    longestStreak: 0,
    ...overrides,
  };
}

describe("evolution/progression", () => {
  describe("meetsCriteria", () => {
    it("meets criteria when all thresholds passed", () => {
      const stats = makeStats({ daysActive: 7, totalInteractions: 20 });
      const result = meetsCriteria(stats, { minDaysActive: 7, minInteractions: 20 });
      expect(result.met).toBe(true);
      expect(result.unmet).toEqual([]);
    });

    it("fails when interactions insufficient", () => {
      const stats = makeStats({ daysActive: 10, totalInteractions: 15 });
      const result = meetsCriteria(stats, { minDaysActive: 7, minInteractions: 20 });
      expect(result.met).toBe(false);
      expect(result.unmet).toContain("interactions: 15/20");
    });

    it("fails when days insufficient", () => {
      const stats = makeStats({ daysActive: 5, totalInteractions: 50 });
      const result = meetsCriteria(stats, { minDaysActive: 7, minInteractions: 20 });
      expect(result.met).toBe(false);
      expect(result.unmet).toContain("daysActive: 5/7");
    });

    it("checks skills used when required", () => {
      const stats = makeStats({
        daysActive: 100,
        totalInteractions: 500,
        skillsUsed: ["a", "b", "c"],
      });
      const result = meetsCriteria(stats, {
        minDaysActive: 90,
        minInteractions: 300,
        minSkillsUsed: 5,
      });
      expect(result.met).toBe(false);
      expect(result.unmet).toContain("skillsUsed: 3/5");
    });
  });

  describe("evaluateProgression", () => {
    it("level 1 -> 2 when XP >= 100", () => {
      const stats = makeStats({ xp: 100 });
      const result = evaluateProgression(1, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(2);
    });

    it("stays at level 1 when XP < 100", () => {
      const stats = makeStats({ xp: 50 });
      const result = evaluateProgression(1, stats);
      expect(result.shouldLevelUp).toBe(false);
      expect(result.unmetCriteria).toBeDefined();
    });

    it("level 2 -> 3 when XP >= 500", () => {
      const stats = makeStats({ xp: 500 });
      const result = evaluateProgression(2, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(3);
    });

    it("level 5 -> 6 when XP >= 15000", () => {
      const stats = makeStats({ xp: 15000 });
      const result = evaluateProgression(5, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(6);
    });

    it("does not level up past max (rank SSS)", () => {
      const stats = makeStats({ xp: 999999 });
      const result = evaluateProgression(8, stats);
      expect(result.shouldLevelUp).toBe(false);
      expect(result.reason).toBe("already at max rank (SSS)");
    });
  });

  describe("formatLevelUpMessage", () => {
    it("formats rank D level up", () => {
      const msg = formatLevelUpMessage(1, 2);
      expect(msg).toContain("Rank D");
      expect(msg).toContain("Secretaria Funcional");
      expect(msg).toContain("Lembra seu nome");
    });

    it("formats rank A level up", () => {
      const msg = formatLevelUpMessage(4, 5);
      expect(msg).toContain("Rank A");
      expect(msg).toContain("IA de Elite");
      expect(msg).toContain("Opera 24/7");
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  evaluateProgression,
  meetsCriteria,
  formatLevelUpMessage,
} from "./progression.js";
import type { EvolutionStats } from "./tracker.js";

function makeStats(overrides: Partial<EvolutionStats> = {}): EvolutionStats {
  return {
    totalInteractions: 0,
    daysActive: 0,
    skillsUsed: [],
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    activeDays: [],
    ...overrides,
  };
}

describe("evolution/progression", () => {
  describe("meetsCriteria", () => {
    it("meets level 2 criteria", () => {
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
    it("level 1 → 2 when criteria met", () => {
      const stats = makeStats({ daysActive: 10, totalInteractions: 25 });
      const result = evaluateProgression(1, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(2);
    });

    it("stays at level 1 when criteria not met", () => {
      const stats = makeStats({ daysActive: 3, totalInteractions: 5 });
      const result = evaluateProgression(1, stats);
      expect(result.shouldLevelUp).toBe(false);
      expect(result.unmetCriteria).toBeDefined();
    });

    it("level 2 → 3 when criteria met", () => {
      const stats = makeStats({ daysActive: 30, totalInteractions: 100 });
      const result = evaluateProgression(2, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(3);
    });

    it("level 3 → 4 requires skills", () => {
      const stats = makeStats({
        daysActive: 90,
        totalInteractions: 300,
        skillsUsed: ["a", "b", "c", "d", "e"],
      });
      const result = evaluateProgression(3, stats);
      expect(result.shouldLevelUp).toBe(true);
      expect(result.nextLevel).toBe(4);
    });

    it("does not level up past max", () => {
      const stats = makeStats({ daysActive: 365, totalInteractions: 10000 });
      const result = evaluateProgression(5, stats);
      expect(result.shouldLevelUp).toBe(false);
      expect(result.reason).toBe("already at max level");
    });
  });

  describe("formatLevelUpMessage", () => {
    it("formats level 2 message", () => {
      const msg = formatLevelUpMessage(1, 2);
      expect(msg).toContain("Aprendiz");
      expect(msg).toContain("Nível 2");
      expect(msg).toContain("Lembra nome");
    });

    it("formats level 5 message", () => {
      const msg = formatLevelUpMessage(4, 5);
      expect(msg).toContain("Autônoma");
      expect(msg).toContain("Opera 24/7");
    });
  });
});

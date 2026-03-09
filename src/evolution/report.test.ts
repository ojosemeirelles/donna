import { describe, expect, it } from "vitest";
import { buildReportData, formatReportTelegram, calculateWeekNumber } from "./report.js";
import type { EvolutionStats } from "./tracker.js";

function makeStats(overrides: Partial<EvolutionStats> = {}): EvolutionStats {
  return {
    totalInteractions: 50,
    daysActive: 14,
    skillsUsed: ["search", "code-gen", "translate"],
    firstSeenAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    activeDays: [],
    xp: 200,
    tasksCompleted: 5,
    errorsResolved: 2,
    uptimeHours: 10,
    streakDays: 3,
    longestStreak: 5,
    ...overrides,
  };
}

describe("evolution/report", () => {
  describe("calculateWeekNumber", () => {
    it("returns 1 for today", () => {
      expect(calculateWeekNumber(new Date().toISOString())).toBe(1);
    });

    it("returns 2 for 8 days ago", () => {
      const date = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      expect(calculateWeekNumber(date)).toBe(2);
    });
  });

  describe("buildReportData", () => {
    it("builds report for level 2 with rank and title", () => {
      const stats = makeStats({ totalInteractions: 50, daysActive: 14, xp: 200 });
      const data = buildReportData(2, stats, 15);
      expect(data.level).toBe(2);
      expect(data.rank).toBe("D");
      expect(data.title).toBe("Secretaria Funcional");
      expect(data.weekInteractions).toBe(15);
      expect(data.nextLevelProgress.nextLevel).toBe(3);
      expect(data.nextLevelProgress.nextRank).toBe("C");
    });

    it("shows no next level at max rank SSS", () => {
      const stats = makeStats({ xp: 200000 });
      const data = buildReportData(8, stats, 30);
      expect(data.nextLevelProgress.nextLevel).toBeNull();
      expect(data.nextLevelProgress.progressPercent).toBe(100);
    });

    it("includes insights", () => {
      const stats = makeStats({ totalInteractions: 100, daysActive: 20 });
      const data = buildReportData(2, stats, 25);
      expect(data.insights.length).toBeGreaterThan(0);
    });

    it("includes initiatives", () => {
      const stats = makeStats();
      const data = buildReportData(2, stats);
      expect(data.initiatives.length).toBeGreaterThan(0);
    });

    it("calculates XP progress percent", () => {
      // Level 2 requires 100 XP, level 3 requires 500 XP, range = 400
      // With 300 XP, progress = (300-100)/400 = 50%
      const stats = makeStats({ xp: 300 });
      const data = buildReportData(2, stats);
      expect(data.nextLevelProgress.progressPercent).toBe(50);
    });
  });

  describe("formatReportTelegram", () => {
    it("formats for Telegram with rank info", () => {
      const stats = makeStats({ totalInteractions: 50, daysActive: 14, xp: 200 });
      const data = buildReportData(2, stats, 12);
      const text = formatReportTelegram(data);

      expect(text).toContain("Rank D");
      expect(text).toContain("Secretaria Funcional");
      expect(text).toContain("XP:");
      expect(text).toContain("Stats:");
    });

    it("shows max rank at level 8", () => {
      const stats = makeStats({ xp: 200000 });
      const data = buildReportData(8, stats, 50);
      const text = formatReportTelegram(data);
      expect(text).toContain("RANK MAXIMO");
    });
  });
});

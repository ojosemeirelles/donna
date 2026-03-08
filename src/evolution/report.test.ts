import { describe, expect, it } from "vitest";
import {
  buildReportData,
  formatReportTelegram,
  calculateWeekNumber,
} from "./report.js";
import type { EvolutionStats } from "./tracker.js";

function makeStats(overrides: Partial<EvolutionStats> = {}): EvolutionStats {
  return {
    totalInteractions: 50,
    daysActive: 14,
    skillsUsed: ["search", "code-gen", "translate"],
    firstSeenAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    activeDays: [],
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
    it("builds report for level 2", () => {
      const stats = makeStats({ totalInteractions: 50, daysActive: 14 });
      const data = buildReportData(2, stats, 15);
      expect(data.level).toBe(2);
      expect(data.levelName).toBe("Aprendiz");
      expect(data.weekInteractions).toBe(15);
      expect(data.nextLevelProgress.nextLevel).toBe(3);
      expect(data.nextLevelProgress.nextLevelName).toBe("Assistente");
    });

    it("shows no next level at max", () => {
      const stats = makeStats({ totalInteractions: 2000, daysActive: 200 });
      const data = buildReportData(5, stats, 30);
      expect(data.nextLevelProgress.nextLevel).toBeNull();
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
  });

  describe("formatReportTelegram", () => {
    it("formats for Telegram with markdown", () => {
      const stats = makeStats({ totalInteractions: 50, daysActive: 14 });
      const data = buildReportData(2, stats, 12);
      const text = formatReportTelegram(data);

      expect(text).toContain("⚔️");
      expect(text).toContain("Nível 2");
      expect(text).toContain("Aprendiz");
      expect(text).toContain("12 interações");
      expect(text).toContain("📈");
      expect(text).toContain("🔓");
    });

    it("shows max level badge at level 5", () => {
      const stats = makeStats({ totalInteractions: 2000, daysActive: 200 });
      const data = buildReportData(5, stats, 50);
      const text = formatReportTelegram(data);
      expect(text).toContain("🏆");
      expect(text).toContain("máximo");
    });
  });
});

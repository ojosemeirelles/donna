import { describe, expect, it } from "vitest";
import {
  LEVEL_DEFINITIONS,
  getLevelDefinition,
  getMaxLevel,
  getRankForLevel,
  getLevelForXp,
  type EvolutionLevel,
} from "./level.js";

describe("evolution/level", () => {
  it("defines exactly 8 ranks", () => {
    expect(LEVEL_DEFINITIONS).toHaveLength(8);
  });

  it("levels are numbered 1 through 8", () => {
    expect(LEVEL_DEFINITIONS.map((d) => d.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("ranks follow Solo Leveling order", () => {
    expect(LEVEL_DEFINITIONS.map((d) => d.rank)).toEqual([
      "E",
      "D",
      "C",
      "B",
      "A",
      "S",
      "SS",
      "SSS",
    ]);
  });

  it("getLevelDefinition returns correct definition", () => {
    const def = getLevelDefinition(3);
    expect(def.rank).toBe("C");
    expect(def.title).toBe("Agente Confiavel");
  });

  it("getLevelDefinition throws for invalid level", () => {
    expect(() => getLevelDefinition(0 as EvolutionLevel)).toThrow("Unknown evolution level");
  });

  it("getMaxLevel returns 8", () => {
    expect(getMaxLevel()).toBe(8);
  });

  it("getRankForLevel returns correct rank", () => {
    expect(getRankForLevel(1)).toBe("E");
    expect(getRankForLevel(5)).toBe("A");
    expect(getRankForLevel(8)).toBe("SSS");
  });

  it("getLevelForXp returns correct level", () => {
    expect(getLevelForXp(0)).toBe(1);
    expect(getLevelForXp(99)).toBe(1);
    expect(getLevelForXp(100)).toBe(2);
    expect(getLevelForXp(500)).toBe(3);
    expect(getLevelForXp(150000)).toBe(8);
  });

  it("each level has increasing XP requirement", () => {
    for (let i = 1; i < LEVEL_DEFINITIONS.length; i++) {
      expect(LEVEL_DEFINITIONS[i].xpRequired).toBeGreaterThan(LEVEL_DEFINITIONS[i - 1].xpRequired);
    }
  });

  it("level 1 (Rank E) requires 0 XP", () => {
    const def = getLevelDefinition(1);
    expect(def.xpRequired).toBe(0);
    expect(def.rank).toBe("E");
  });
});

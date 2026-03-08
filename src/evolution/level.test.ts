import { describe, expect, it } from "vitest";
import {
  LEVEL_DEFINITIONS,
  getLevelDefinition,
  getMaxLevel,
  type EvolutionLevel,
} from "./level.js";

describe("evolution/level", () => {
  it("defines exactly 5 levels", () => {
    expect(LEVEL_DEFINITIONS).toHaveLength(5);
  });

  it("levels are numbered 1 through 5", () => {
    expect(LEVEL_DEFINITIONS.map((d) => d.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("getLevelDefinition returns correct definition", () => {
    const def = getLevelDefinition(3);
    expect(def.name).toBe("Assistente");
    expect(def.level).toBe(3);
  });

  it("getLevelDefinition throws for invalid level", () => {
    expect(() => getLevelDefinition(0 as EvolutionLevel)).toThrow("Unknown evolution level");
  });

  it("getMaxLevel returns 5", () => {
    expect(getMaxLevel()).toBe(5);
  });

  it("each level has increasing criteria", () => {
    for (let i = 1; i < LEVEL_DEFINITIONS.length; i++) {
      const prev = LEVEL_DEFINITIONS[i - 1]!;
      const curr = LEVEL_DEFINITIONS[i]!;
      expect(curr.criteria.minDaysActive).toBeGreaterThanOrEqual(prev.criteria.minDaysActive);
      expect(curr.criteria.minInteractions).toBeGreaterThanOrEqual(prev.criteria.minInteractions);
    }
  });

  it("level 1 has zero criteria (immediate unlock)", () => {
    const def = getLevelDefinition(1);
    expect(def.criteria.minDaysActive).toBe(0);
    expect(def.criteria.minInteractions).toBe(0);
  });
});

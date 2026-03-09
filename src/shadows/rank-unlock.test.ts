import { describe, it, expect } from "vitest";
import { formatShadowUnlockMessage, type UnlockResult } from "./rank-unlock.js";

describe("formatShadowUnlockMessage", () => {
  it("returns null when no shadows unlocked", () => {
    const result: UnlockResult = { unlocked: [], messages: [] };
    expect(formatShadowUnlockMessage(result)).toBeNull();
  });

  it("formats single shadow unlock", () => {
    const result: UnlockResult = {
      unlocked: [
        {
          name: "Tusk",
          role: "Researcher",
          squad: "researcher",
          rank_required: "D",
          status: "active",
          tools: ["web_search"],
          soul: "Tusk is relentless.",
        },
      ],
      messages: ["Tusk unlocked"],
    };
    const msg = formatShadowUnlockMessage(result);
    expect(msg).not.toBeNull();
    expect(msg).toContain("ARISE!");
    expect(msg).toContain("Tusk");
    expect(msg).toContain("Researcher");
    expect(msg).toContain("Tusk is relentless.");
  });

  it("formats multiple shadow unlocks", () => {
    const result: UnlockResult = {
      unlocked: [
        {
          name: "Tusk",
          role: "Researcher",
          squad: "researcher",
          rank_required: "D",
          status: "active",
          tools: ["web_search"],
          soul: "Tusk is relentless.",
        },
        {
          name: "Iron",
          role: "Writer",
          squad: "writer",
          rank_required: "C",
          status: "active",
          tools: ["write"],
          soul: "Iron is the craftsman.",
        },
      ],
      messages: [],
    };
    const msg = formatShadowUnlockMessage(result);
    expect(msg).toContain("Tusk");
    expect(msg).toContain("Iron");
    expect(msg).toContain("2 novas");
  });
});

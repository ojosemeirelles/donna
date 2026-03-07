import { describe, expect, it } from "vitest";
import {
  buildIdentityContextBlock,
  extractIdentityClues,
  getIdentityLanguage,
  mergeIdentityUpdate,
  resolveIdentityConfig,
  type UserIdentity,
} from "./identity-memory.js";

// ---------------------------------------------------------------------------
// resolveIdentityConfig
// ---------------------------------------------------------------------------

describe("resolveIdentityConfig", () => {
  it("returns enabled=true by default", () => {
    expect(resolveIdentityConfig().enabled).toBe(true);
  });

  it("respects enabled=false", () => {
    expect(resolveIdentityConfig({ enabled: false }).enabled).toBe(false);
  });

  it("returns required fields", () => {
    const cfg = resolveIdentityConfig();
    expect(cfg).toHaveProperty("enabled");
  });
});

// ---------------------------------------------------------------------------
// mergeIdentityUpdate
// ---------------------------------------------------------------------------

describe("mergeIdentityUpdate", () => {
  it("merges basic scalar fields", () => {
    const merged = mergeIdentityUpdate({}, { name: "José" });
    expect(merged.name).toBe("José");
  });

  it("deduplicates expertise arrays", () => {
    const merged = mergeIdentityUpdate(
      { expertise: ["TypeScript", "Node"] },
      { expertise: ["TypeScript", "React"] },
    );
    expect(merged.expertise).toEqual(["TypeScript", "Node", "React"]);
  });

  it("deduplicates goals arrays", () => {
    const merged = mergeIdentityUpdate(
      { goals: ["learn TS"] },
      { goals: ["learn TS", "build AIOS"] },
    );
    expect(merged.goals).toEqual(["learn TS", "build AIOS"]);
  });

  it("merges preferences objects with update winning", () => {
    const merged = mergeIdentityUpdate(
      { preferences: { theme: "dark" } },
      { preferences: { theme: "light", lang: "pt" } },
    );
    expect(merged.preferences).toEqual({ theme: "light", lang: "pt" });
  });

  it("sets updatedAt to an ISO string", () => {
    const merged = mergeIdentityUpdate({}, { name: "Test" });
    expect(merged.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves existing fields not in update", () => {
    const merged = mergeIdentityUpdate({ timezone: "UTC" }, { name: "Alice" });
    expect(merged.timezone).toBe("UTC");
    expect(merged.name).toBe("Alice");
  });

  it("omits empty expertise", () => {
    const merged = mergeIdentityUpdate({}, {});
    expect(merged.expertise).toBeUndefined();
  });

  it("update communicationStyle overrides current", () => {
    const merged = mergeIdentityUpdate(
      { communicationStyle: "formal" },
      { communicationStyle: "casual" },
    );
    expect(merged.communicationStyle).toBe("casual");
  });
});

// ---------------------------------------------------------------------------
// extractIdentityClues
// ---------------------------------------------------------------------------

describe("extractIdentityClues", () => {
  it("detects Portuguese from pt markers", () => {
    const clues = extractIdentityClues([{ role: "user", content: "Olá, você pode me ajudar?" }]);
    expect(clues.preferredLanguage).toBe("pt");
  });

  it("detects English from en markers", () => {
    const clues = extractIdentityClues([
      { role: "user", content: "Hello, could you please help me?" },
    ]);
    expect(clues.preferredLanguage).toBe("en");
  });

  it("extracts name from 'my name is' pattern", () => {
    const clues = extractIdentityClues([
      { role: "user", content: "Hello, my name is Alice. Can you help?" },
    ]);
    expect(clues.name).toBe("Alice");
  });

  it("extracts name from 'Me chamo' pattern", () => {
    const clues = extractIdentityClues([
      { role: "user", content: "Me chamo Carlos, preciso de ajuda." },
    ]);
    expect(clues.name).toBe("Carlos");
  });

  it("ignores assistant messages for language detection", () => {
    const clues = extractIdentityClues([
      { role: "assistant", content: "Olá! Posso ajudar." },
      { role: "user", content: "please help me" },
    ]);
    expect(clues.preferredLanguage).toBe("en");
  });

  it("returns empty object when no clues found", () => {
    const clues = extractIdentityClues([{ role: "user", content: "12345 xyz" }]);
    expect(clues).toEqual({});
  });

  it("handles empty messages array", () => {
    const clues = extractIdentityClues([]);
    expect(clues).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// buildIdentityContextBlock
// ---------------------------------------------------------------------------

describe("buildIdentityContextBlock", () => {
  it("returns empty string for empty identity", () => {
    expect(buildIdentityContextBlock({})).toBe("");
  });

  it("includes name when present", () => {
    const block = buildIdentityContextBlock({ name: "José" });
    expect(block).toContain("José");
  });

  it("includes Portuguese label for preferredLanguage=pt", () => {
    const block = buildIdentityContextBlock({ preferredLanguage: "pt" });
    expect(block).toContain("Portuguese");
  });

  it("includes expertise list", () => {
    const identity: UserIdentity = { expertise: ["TypeScript", "React"] };
    const block = buildIdentityContextBlock(identity);
    expect(block).toContain("TypeScript");
    expect(block).toContain("React");
  });

  it("includes goals", () => {
    const block = buildIdentityContextBlock({ goals: ["build AIOS"] });
    expect(block).toContain("build AIOS");
  });

  it("includes communication style", () => {
    const block = buildIdentityContextBlock({ communicationStyle: "technical" });
    expect(block).toContain("technical");
  });

  it("includes custom preferences as key-value lines", () => {
    const block = buildIdentityContextBlock({ preferences: { theme: "dark" } });
    expect(block).toContain("theme: dark");
  });

  it("starts with ## User Identity header", () => {
    const block = buildIdentityContextBlock({ name: "X" });
    expect(block).toMatch(/^## User Identity/);
  });
});

// ---------------------------------------------------------------------------
// getIdentityLanguage
// ---------------------------------------------------------------------------

describe("getIdentityLanguage", () => {
  it("returns preferredLanguage when set", () => {
    expect(getIdentityLanguage({ preferredLanguage: "en" })).toBe("en");
  });

  it("defaults to 'pt' when no language set", () => {
    expect(getIdentityLanguage({})).toBe("pt");
  });
});

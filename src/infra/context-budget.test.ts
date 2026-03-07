import { describe, expect, it } from "vitest";
import {
  describeBootstrapTier,
  detectBootstrapTier,
  enforceToolOutputBudget,
  filterContentByKeywords,
  isToolOutputTruncated,
  resolveContextBudgetConfig,
} from "./context-budget.js";

describe("resolveContextBudgetConfig", () => {
  it("applies defaults when no config provided", () => {
    const cfg = resolveContextBudgetConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.toolOutputLimitTokens).toBe(2000);
  });

  it("respects custom tool output limit", () => {
    const cfg = resolveContextBudgetConfig({ toolOutputLimitTokens: 500 });
    expect(cfg.toolOutputLimitTokens).toBe(500);
  });
});

describe("detectBootstrapTier", () => {
  it("returns 'minimal' for cron jobs", () => {
    expect(detectBootstrapTier({ isCronJob: true })).toBe("minimal");
  });

  it("returns 'minimal' for subagents", () => {
    expect(detectBootstrapTier({ isSubagent: true })).toBe("minimal");
  });

  it("returns 'minimal' when both cron and subagent flags are set", () => {
    expect(detectBootstrapTier({ isCronJob: true, isSubagent: true })).toBe("minimal");
  });

  it("returns 'full' when isExplicitFull is true", () => {
    expect(detectBootstrapTier({ isExplicitFull: true })).toBe("full");
  });

  it("returns 'standard' for regular interactive sessions", () => {
    expect(detectBootstrapTier({})).toBe("standard");
  });

  it("'minimal' takes precedence over 'full' (cron + explicitFull)", () => {
    // isCronJob is checked first
    expect(detectBootstrapTier({ isCronJob: true, isExplicitFull: true })).toBe("minimal");
  });
});

describe("describeBootstrapTier", () => {
  it("minimal tier excludes all context", () => {
    const desc = describeBootstrapTier("minimal");
    expect(desc.includeMemoryMd).toBe(false);
    expect(desc.includeUserMd).toBe(false);
    expect(desc.includeExtraFiles).toBe(false);
  });

  it("standard tier includes memory and user md but not extra files", () => {
    const desc = describeBootstrapTier("standard");
    expect(desc.includeMemoryMd).toBe(true);
    expect(desc.includeUserMd).toBe(true);
    expect(desc.includeExtraFiles).toBe(false);
  });

  it("full tier includes everything", () => {
    const desc = describeBootstrapTier("full");
    expect(desc.includeMemoryMd).toBe(true);
    expect(desc.includeUserMd).toBe(true);
    expect(desc.includeExtraFiles).toBe(true);
  });
});

describe("filterContentByKeywords", () => {
  const content = [
    "line 1: unrelated",
    "line 2: contains token keyword",
    "line 3: unrelated again",
    "line 4: unrelated",
    "line 5: has another match",
    "line 6: unrelated",
  ].join("\n");

  it("returns matching lines with context", () => {
    const result = filterContentByKeywords(content, ["token"], 1);
    expect(result).toContain("line 2");
    // Context: line 1 and line 3 should also be included
    expect(result).toContain("line 1");
    expect(result).toContain("line 3");
  });

  it("returns empty string when no keywords match", () => {
    const result = filterContentByKeywords(content, ["nonexistent"]);
    expect(result).toBe("");
  });

  it("returns empty string when keywords array is empty", () => {
    const result = filterContentByKeywords(content, []);
    expect(result).toBe("");
  });

  it("is case-insensitive", () => {
    const result = filterContentByKeywords(content, ["TOKEN"]);
    expect(result).toContain("line 2");
  });

  it("inserts ellipsis between non-adjacent matches", () => {
    const result = filterContentByKeywords(content, ["token", "another"], 0);
    // With contextLines=0, lines 1 and 4 are separate → ellipsis between them
    expect(result).toContain("...");
  });
});

describe("enforceToolOutputBudget", () => {
  it("returns output unchanged when within limit", () => {
    const output = "short output";
    expect(enforceToolOutputBudget(output, 2000)).toBe(output);
  });

  it("truncates output when above limit and adds marker", () => {
    const output = "a".repeat(9000); // 9000 chars = ~2250 tokens, above 2000 token limit
    const result = enforceToolOutputBudget(output, 2000);
    expect(result.length).toBeLessThan(output.length);
    expect(result).toContain("[TRUNCATED");
  });

  it("uses default limit of 2000 tokens when not specified", () => {
    const output = "a".repeat(9000);
    const result = enforceToolOutputBudget(output);
    expect(result).toContain("[TRUNCATED");
  });

  it("preserves output exactly when at the boundary", () => {
    const output = "a".repeat(8000); // exactly 2000 tokens
    const result = enforceToolOutputBudget(output, 2000);
    expect(result).toBe(output);
    expect(isToolOutputTruncated(result)).toBe(false);
  });
});

describe("isToolOutputTruncated", () => {
  it("returns true for truncated output", () => {
    const output = "some content\n[TRUNCATED — use /expand for full output]";
    expect(isToolOutputTruncated(output)).toBe(true);
  });

  it("returns false for non-truncated output", () => {
    expect(isToolOutputTruncated("normal output")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isToolOutputTruncated("")).toBe(false);
  });
});

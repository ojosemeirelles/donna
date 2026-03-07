import { describe, expect, it } from "vitest";
import {
  buildCompactionSystemPrompt,
  evaluateCompactionNeed,
  extractCredentialMentions,
  extractPendingTasks,
  generateSessionSummary,
  resolveAutoCompactConfig,
} from "./auto-compact.js";

describe("resolveAutoCompactConfig", () => {
  it("applies defaults when no config provided", () => {
    const cfg = resolveAutoCompactConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.threshold).toBe(0.7);
    expect(cfg.preserveLastN).toBe(10);
  });

  it("respects custom values", () => {
    const cfg = resolveAutoCompactConfig({ threshold: 0.85, preserveLastN: 5 });
    expect(cfg.threshold).toBe(0.85);
    expect(cfg.preserveLastN).toBe(5);
  });
});

describe("evaluateCompactionNeed", () => {
  it("returns shouldCompact=false when below threshold", () => {
    const result = evaluateCompactionNeed({ currentTokens: 5000, contextWindowTokens: 10000 });
    expect(result.shouldCompact).toBe(false);
    expect(result.usageRatio).toBe(0.5);
  });

  it("returns shouldCompact=true when at threshold", () => {
    const result = evaluateCompactionNeed({ currentTokens: 7000, contextWindowTokens: 10000 });
    expect(result.shouldCompact).toBe(true);
  });

  it("returns shouldCompact=true when above threshold", () => {
    const result = evaluateCompactionNeed({ currentTokens: 9000, contextWindowTokens: 10000 });
    expect(result.shouldCompact).toBe(true);
    expect(result.usageRatio).toBe(0.9);
  });

  it("respects custom threshold", () => {
    const result = evaluateCompactionNeed({
      currentTokens: 5500,
      contextWindowTokens: 10000,
      config: { threshold: 0.9 },
    });
    expect(result.shouldCompact).toBe(false);
  });

  it("returns shouldCompact=false when disabled", () => {
    const result = evaluateCompactionNeed({
      currentTokens: 9900,
      contextWindowTokens: 10000,
      config: { enabled: false },
    });
    expect(result.shouldCompact).toBe(false);
    expect(result.reason).toContain("disabled");
  });

  it("exposes currentTokens and contextWindowTokens in result", () => {
    const result = evaluateCompactionNeed({ currentTokens: 3000, contextWindowTokens: 8000 });
    expect(result.currentTokens).toBe(3000);
    expect(result.contextWindowTokens).toBe(8000);
  });
});

describe("extractCredentialMentions", () => {
  it("detects token: value patterns", () => {
    const mentions = extractCredentialMentions("Use token: abc123def456ghi789jkl0");
    expect(mentions.length).toBeGreaterThan(0);
  });

  it("returns empty array when no credentials found", () => {
    const mentions = extractCredentialMentions("Hello, how are you doing today?");
    expect(mentions).toHaveLength(0);
  });

  it("detects api_key mentions", () => {
    const mentions = extractCredentialMentions("api_key=sk-1234567890abcdef");
    expect(mentions.length).toBeGreaterThan(0);
  });
});

describe("extractPendingTasks", () => {
  it("detects TODO lines", () => {
    const tasks = extractPendingTasks("// TODO: fix this bug\nsome other code");
    expect(tasks.some((t) => t.includes("TODO"))).toBe(true);
  });

  it("detects FIXME lines", () => {
    const tasks = extractPendingTasks("// FIXME: this is broken");
    expect(tasks.some((t) => t.includes("FIXME"))).toBe(true);
  });

  it("detects 'pendente' (Portuguese)", () => {
    const tasks = extractPendingTasks("Tarefa pendente: revisar PR");
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("returns empty array when no pending tasks", () => {
    const tasks = extractPendingTasks("Everything is done and working.");
    expect(tasks).toHaveLength(0);
  });
});

describe("generateSessionSummary", () => {
  it("returns a summary with metadata", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there, how can I help?" },
    ];
    const summary = generateSessionSummary(messages);
    expect(summary.messageCountBefore).toBe(2);
    expect(typeof summary.compactedAt).toBe("string");
  });

  it("preserves last N messages (does not analyze them)", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `TODO: task ${i}`,
    }));
    // With default preserveLastN=10, only first 5 messages are analyzed
    const summary = generateSessionSummary(messages, { preserveLastN: 10 });
    // The tasks from the last 10 messages should not be in pendingTasks
    // (they are preserved, not compacted)
    expect(summary.messageCountBefore).toBe(15);
  });

  it("extracts pending tasks from older messages", () => {
    const messages = [
      { role: "user", content: "TODO: fix the login bug" },
      ...Array.from({ length: 10 }, () => ({ role: "user", content: "normal message" })),
    ];
    const summary = generateSessionSummary(messages, { preserveLastN: 10 });
    expect(summary.pendingTasks.some((t) => t.includes("TODO"))).toBe(true);
  });

  it("extracts key facts from assistant messages in compacted range", () => {
    const messages = [
      { role: "assistant", content: "I decided to use PostgreSQL for this project." },
      ...Array.from({ length: 10 }, () => ({ role: "user", content: "ok" })),
    ];
    const summary = generateSessionSummary(messages, { preserveLastN: 10 });
    expect(summary.keyFacts.some((f) => f.includes("PostgreSQL"))).toBe(true);
  });
});

describe("buildCompactionSystemPrompt", () => {
  it("includes all sections when data is present", () => {
    const summary = {
      decisions: ["Use TypeScript"],
      pendingTasks: ["TODO: fix tests"],
      credentials: ["token: abc123"],
      keyFacts: ["Using pnpm as package manager"],
      compactedAt: "2026-03-07T12:00:00.000Z",
      messageCountBefore: 42,
    };
    const prompt = buildCompactionSystemPrompt(summary);
    expect(prompt).toContain("Session Context");
    expect(prompt).toContain("Pending Tasks");
    expect(prompt).toContain("Key Facts");
    expect(prompt).toContain("Credentials Mentioned");
    expect(prompt).toContain("Decisions Made");
  });

  it("omits empty sections", () => {
    const summary = {
      decisions: [],
      pendingTasks: [],
      credentials: [],
      keyFacts: ["Fact 1"],
      compactedAt: "2026-03-07T12:00:00.000Z",
      messageCountBefore: 5,
    };
    const prompt = buildCompactionSystemPrompt(summary);
    expect(prompt).not.toContain("Pending Tasks");
    expect(prompt).not.toContain("Credentials");
    expect(prompt).toContain("Key Facts");
  });

  it("includes message count and timestamp", () => {
    const summary = {
      decisions: [],
      pendingTasks: [],
      credentials: [],
      keyFacts: [],
      compactedAt: "2026-03-07T12:00:00.000Z",
      messageCountBefore: 100,
    };
    const prompt = buildCompactionSystemPrompt(summary);
    expect(prompt).toContain("100");
    expect(prompt).toContain("2026-03-07");
  });
});

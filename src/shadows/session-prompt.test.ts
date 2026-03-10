import { describe, it, expect } from "vitest";
import { buildShadowSystemPrompt } from "./session-prompt.js";
import type { ShadowDefinition, ParentContext } from "./types.js";

const MOCK_SHADOW: ShadowDefinition = {
  name: "Igris",
  role: "Commander — General Purpose",
  squad: "vanguard",
  rank_required: "E",
  status: "active",
  tools: ["web-search", "code-exec"],
  soul: "O cavaleiro mais leal do Monarca.",
};

describe("buildShadowSystemPrompt", () => {
  it("includes shadow name and role as header", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul content", {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("# Igris — Commander — General Purpose");
  });

  it("includes SOUL.md content", () => {
    const soulMd = "I am Igris, the shadow knight.\n\nI serve the Monarch.";
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, soulMd, {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("I am Igris, the shadow knight.");
    expect(prompt).toContain("I serve the Monarch.");
  });

  it("lists tool restrictions", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("## Restrictions");
    expect(prompt).toContain("Tools: web-search, code-exec");
  });

  it("includes delegation prohibition", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("Do NOT delegate to other shadows");
  });

  it("includes parent context with channel and userId", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "whatsapp",
      userId: "user-42",
      summary: null,
    });

    expect(prompt).toContain("## Context from Monarch session");
    expect(prompt).toContain("Channel: whatsapp");
    expect(prompt).toContain("User: user-42");
  });

  it("includes summary when provided", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "telegram",
      userId: "user-1",
      summary: "User is working on a TypeScript refactor",
    });

    expect(prompt).toContain("Summary: User is working on a TypeScript refactor");
  });

  it("omits summary line when null", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).not.toContain("Summary:");
  });

  it("shows unknown when channel is undefined", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: undefined,
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("Channel: unknown");
  });

  it("includes conciseness instruction", () => {
    const prompt = buildShadowSystemPrompt(MOCK_SHADOW, "# Soul", {
      channel: "telegram",
      userId: "user-1",
      summary: null,
    });

    expect(prompt).toContain("concise");
  });
});

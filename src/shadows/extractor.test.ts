import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractShadow, loadRegistry, getShadowByRole } from "./extractor.js";
import type { ShadowRegistry } from "./types.js";

// We test loadRegistry and getShadowByRole with in-memory data
// since extractShadow writes to real ~/.donna paths.

describe("getShadowByRole", () => {
  const registry: ShadowRegistry = {
    monarch: "Donna",
    shadows: [
      {
        name: "Tusk",
        role: "Researcher",
        squad: "researcher",
        rank_required: "D",
        status: "active",
        tools: ["web_search", "web_fetch", "read"],
        soul: "Tusk is relentless.",
      },
      {
        name: "Iron",
        role: "Writer",
        squad: "writer",
        rank_required: "C",
        status: "locked",
        tools: ["write", "edit"],
        soul: "Iron is the craftsman.",
      },
      {
        name: "Beru",
        role: "Executor",
        squad: "executor",
        rank_required: "A",
        status: "active",
        tools: ["exec", "process"],
        soul: "Beru is powerful.",
      },
    ],
  };

  it("returns active shadow matching intent", () => {
    const result = getShadowByRole("research", registry);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Tusk");
  });

  it("returns null for locked shadow", () => {
    const result = getShadowByRole("write", registry);
    expect(result).toBeNull();
  });

  it("returns active shadow for exec intent", () => {
    const result = getShadowByRole("exec", registry);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Beru");
  });

  it("returns null for unknown intent", () => {
    const result = getShadowByRole("teleport", registry);
    expect(result).toBeNull();
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SquadLoader, SquadLoadError } from "./squad-loader.js";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "donna-squad-test-"));
}

function writeSquadFiles(
  squadsDir: string,
  name: string,
  opts?: { noManifest?: boolean; agents?: Array<{ filename: string; content: string }> },
): void {
  const squadDir = path.join(squadsDir, name);
  fs.mkdirSync(path.join(squadDir, "agents"), { recursive: true });

  if (!opts?.noManifest) {
    fs.writeFileSync(
      path.join(squadDir, "squad.yaml"),
      `name: ${name}
version: 1.0.0
description: Test squad for ${name}
domain: ${name.replace("squad-", "")}
tags: [test, ${name}]
components:
  agents:
    - agente1.md
    - agente2.md
`,
      "utf-8",
    );
  }

  const agents = opts?.agents ?? [
    {
      filename: "agente1.md",
      content: `name: agente1
version: 1.0.0
description: First agent
role: Specialist
expertise:
  - area1
  - area2
preferredModel: claude-sonnet-4-5
system_prompt: |
  You are agente1, a specialist.
`,
    },
    {
      filename: "agente2.md",
      content: `name: agente2
version: 1.0.0
description: Second agent
role: Analyst
expertise:
  - analysis
system_prompt: |
  You are agente2, an analyst.
`,
    },
  ];

  for (const agent of agents) {
    fs.writeFileSync(path.join(squadDir, "agents", agent.filename), agent.content, "utf-8");
  }
}

function cleanupDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SquadLoader", () => {
  let tmpDir: string;
  let loader: SquadLoader;

  beforeEach(() => {
    tmpDir = createTempDir();
    loader = new SquadLoader(tmpDir);
  });

  afterEach(() => {
    loader.stopWatch();
    cleanupDir(tmpDir);
  });

  // ── Constructor ──

  it("accepts custom squads path", () => {
    expect(loader.getSquadsPath()).toBe(tmpDir);
  });

  // ── listAll ──

  it("returns empty array when no squads exist", async () => {
    const result = await loader.listAll();
    expect(result).toEqual([]);
  });

  it("returns empty array when squads directory doesn't exist", async () => {
    const nonExistent = new SquadLoader("/tmp/does-not-exist-donna-test");
    const result = await nonExistent.listAll();
    expect(result).toEqual([]);
  });

  it("lists all valid squads", async () => {
    writeSquadFiles(tmpDir, "squad-juridico");
    writeSquadFiles(tmpDir, "squad-financeiro");

    const squads = await loader.listAll();
    expect(squads).toHaveLength(2);
    expect(squads.map((s) => s.name)).toContain("squad-juridico");
    expect(squads.map((s) => s.name)).toContain("squad-financeiro");
  });

  it("skips hidden directories", async () => {
    writeSquadFiles(tmpDir, "squad-valid");
    fs.mkdirSync(path.join(tmpDir, ".designs"), { recursive: true });

    const squads = await loader.listAll();
    expect(squads).toHaveLength(1);
    expect(squads[0].name).toBe("squad-valid");
  });

  it("skips directories without squad.yaml", async () => {
    writeSquadFiles(tmpDir, "squad-valid");
    writeSquadFiles(tmpDir, "squad-broken", { noManifest: true });

    const squads = await loader.listAll();
    expect(squads).toHaveLength(1);
  });

  // ── loadSquad ──

  it("loads a squad with correct manifest fields", async () => {
    writeSquadFiles(tmpDir, "squad-juridico");
    const squad = await loader.loadSquad("squad-juridico");

    expect(squad.name).toBe("squad-juridico");
    expect(squad.version).toBe("1.0.0");
    expect(squad.domain).toBe("juridico");
    expect(squad.tags).toContain("test");
  });

  it("loads agent definitions from agents/*.md", async () => {
    writeSquadFiles(tmpDir, "squad-test");
    const squad = await loader.loadSquad("squad-test");

    expect(squad.agents).toHaveLength(2);
    expect(squad.agents[0].name).toBe("agente1");
    expect(squad.agents[0].role).toBe("Specialist");
    expect(squad.agents[0].expertise).toEqual(["area1", "area2"]);
    expect(squad.agents[0].systemPrompt).toContain("agente1");
    expect(squad.agents[0].preferredModel).toBe("claude-sonnet-4-5");
  });

  it("throws SquadLoadError for non-existent squad", async () => {
    await expect(loader.loadSquad("does-not-exist")).rejects.toThrow(SquadLoadError);
  });

  it("throws SquadLoadError for squad without manifest", async () => {
    writeSquadFiles(tmpDir, "squad-no-yaml", { noManifest: true });
    await expect(loader.loadSquad("squad-no-yaml")).rejects.toThrow(SquadLoadError);
  });

  it("caches loaded squads", async () => {
    writeSquadFiles(tmpDir, "squad-cached");
    const first = await loader.loadSquad("squad-cached");
    const second = await loader.loadSquad("squad-cached");
    expect(first).toBe(second); // Same reference
  });

  it("clearCache invalidates cache", async () => {
    writeSquadFiles(tmpDir, "squad-cached");
    const first = await loader.loadSquad("squad-cached");
    loader.clearCache();
    const second = await loader.loadSquad("squad-cached");
    expect(first).not.toBe(second);
    expect(first.name).toBe(second.name);
  });

  // ── squadExists ──

  it("returns true for existing squad", async () => {
    writeSquadFiles(tmpDir, "squad-exists");
    expect(await loader.squadExists("squad-exists")).toBe(true);
  });

  it("returns false for non-existent squad", async () => {
    expect(await loader.squadExists("squad-nope")).toBe(false);
  });

  it("returns false for directory without squad.yaml", async () => {
    writeSquadFiles(tmpDir, "squad-no-yaml", { noManifest: true });
    expect(await loader.squadExists("squad-no-yaml")).toBe(false);
  });

  // ── watch ──

  it("detects newly added squad", async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        loader.stopWatch();
        reject(new Error("Watch timeout"));
      }, 5000);

      loader.watch((event, squad) => {
        try {
          expect(event).toBe("added");
          expect(squad.name).toBe("squad-new");
          clearTimeout(timeout);
          loader.stopWatch();
          resolve();
        } catch (err) {
          clearTimeout(timeout);
          loader.stopWatch();
          reject(err);
        }
      });

      // Add squad after small delay
      setTimeout(() => {
        writeSquadFiles(tmpDir, "squad-new");
      }, 200);
    });
  });

  // ── Edge cases ──

  it("handles agents dir missing gracefully", async () => {
    const squadDir = path.join(tmpDir, "squad-no-agents");
    fs.mkdirSync(squadDir, { recursive: true });
    fs.writeFileSync(
      path.join(squadDir, "squad.yaml"),
      "name: squad-no-agents\nversion: 1.0.0\ndescription: no agents\ndomain: test\ntags: [test]\n",
      "utf-8",
    );

    const squad = await loader.loadSquad("squad-no-agents");
    expect(squad.agents).toEqual([]);
  });
});

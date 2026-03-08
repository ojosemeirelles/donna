import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SquadFactory, SquadFactoryError } from "./squad-factory.js";
import type { LLMClient } from "./llm-client.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "donna-factory-test-"));
}

function cleanupDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function mockLLMClient(responseContent?: string): LLMClient {
  const defaultResponse = JSON.stringify({
    squad: {
      name: "squad-juridico",
      version: "1.0.0",
      description: "Squad especializado em jurídico",
      domain: "juridico",
      tags: ["juridico", "contratos"],
      components: { agents: ["advogado.md", "negociador.md"] },
    },
    agents: [
      {
        filename: "advogado.md",
        content:
          "name: advogado\nversion: 1.0.0\ndescription: Especialista\nrole: Advogado\nexpertise:\n  - contratos\nsystem_prompt: |\n  Você é advogado.\n",
      },
      {
        filename: "negociador.md",
        content:
          "name: negociador\nversion: 1.0.0\ndescription: Negociador\nrole: Negociador\nexpertise:\n  - negociacao\nsystem_prompt: |\n  Você é negociador.\n",
      },
    ],
    xpEarned: 300,
    achievement: "Squad Juridico Forjado",
  });

  return {
    call: vi.fn().mockResolvedValue({
      content: responseContent ?? defaultResponse,
      model: "claude-sonnet-4-5",
      provider: "anthropic" as const,
    }),
    detectProvider: vi.fn().mockReturnValue("anthropic"),
    availableProviders: vi.fn().mockReturnValue(["anthropic"]),
  } as unknown as LLMClient;
}

function writeExistingSquad(squadsDir: string): void {
  const squadDir = path.join(squadsDir, "squad-juridico");
  fs.mkdirSync(path.join(squadDir, "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(squadDir, "squad.yaml"),
    "name: squad-juridico\nversion: 1.0.0\ndescription: Existing\ndomain: juridico\ntags: [juridico]\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(squadDir, "agents", "advogado.md"),
    "name: advogado\nversion: 1.0.0\nrole: Advogado\nsystem_prompt: |\n  Existing agent\n",
    "utf-8",
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SquadFactory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(tmpDir);
    vi.restoreAllMocks();
  });

  // ── detectDomain ──

  describe("detectDomain", () => {
    it("detects juridico domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("meu serasa negativou")).toBe("juridico");
      expect(factory.detectDomain("preciso de um advogado")).toBe("juridico");
      expect(factory.detectDomain("analisar este contrato")).toBe("juridico");
    });

    it("detects financeiro domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("quero investir no tesouro direto")).toBe("financeiro");
      expect(factory.detectDomain("minha carteira de investimento")).toBe("financeiro");
    });

    it("detects saude domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("preciso marcar uma consulta médica")).toBe("saude");
    });

    it("detects marketing domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("criar uma campanha de marketing")).toBe("marketing");
      expect(factory.detectDomain("melhorar engajamento nos posts")).toBe("marketing");
    });

    it("detects rh domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("revisar meu currículo")).toBe("rh");
    });

    it("detects tecnologia domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("tem um bug no sistema")).toBe("tecnologia");
    });

    it("returns null for unrecognized domain", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(factory.detectDomain("olá bom dia")).toBeNull();
      expect(factory.detectDomain("que horas são")).toBeNull();
    });

    it("picks domain with most keyword matches", () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      // "processo" is juridico, "lei" is juridico, "direito" is juridico = 3 hits
      expect(factory.detectDomain("preciso entender o processo da lei de direito civil")).toBe("juridico");
    });
  });

  // ── getOrCreate ──

  describe("getOrCreate", () => {
    it("returns existing squad without calling LLM", async () => {
      const llm = mockLLMClient();
      writeExistingSquad(tmpDir);
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: llm });

      const result = await factory.getOrCreate("juridico");

      expect(result.isNew).toBe(false);
      expect(result.xpEarned).toBe(0);
      expect(result.squad.name).toBe("squad-juridico");
      expect(llm.call).not.toHaveBeenCalled();
    });

    it("creates new squad via LLM when not exists", async () => {
      const llm = mockLLMClient();
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: llm });

      const result = await factory.getOrCreate("juridico");

      expect(result.isNew).toBe(true);
      expect(result.xpEarned).toBe(300);
      expect(result.achievement).toBe("Squad Juridico Forjado");
      expect(result.squad.name).toBe("squad-juridico");
      expect(llm.call).toHaveBeenCalledTimes(1);
    });

    it("writes squad.yaml and agent files to disk", async () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });

      await factory.getOrCreate("juridico");

      expect(fs.existsSync(path.join(tmpDir, "squad-juridico", "squad.yaml"))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, "squad-juridico", "agents", "advogado.md"))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, "squad-juridico", "agents", "negociador.md"))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, "squad-juridico", "README.md"))).toBe(true);
    });
  });

  // ── create ──

  describe("create", () => {
    it("throws SquadFactoryError if squad already exists", async () => {
      writeExistingSquad(tmpDir);
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });

      await expect(factory.create("juridico")).rejects.toThrow(SquadFactoryError);
    });

    it("handles LLM response wrapped in markdown fences", async () => {
      const json = JSON.stringify({
        squad: {
          name: "squad-saude",
          version: "1.0.0",
          description: "Saude squad",
          domain: "saude",
          tags: ["saude"],
          components: { agents: ["medico.md"] },
        },
        agents: [
          {
            filename: "medico.md",
            content: "name: medico\nversion: 1.0.0\nrole: Medico\nsystem_prompt: |\n  Voce e medico\n",
          },
        ],
        xpEarned: 300,
        achievement: "Squad Saude Forjado",
      });

      const llm = mockLLMClient("```json\n" + json + "\n```");
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: llm });

      const result = await factory.create("saude");
      expect(result.isNew).toBe(true);
      expect(result.squad.domain).toBe("saude");
    });
  });

  // ── listDomains ──

  describe("listDomains", () => {
    it("returns empty array when no squads", async () => {
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      expect(await factory.listDomains()).toEqual([]);
    });

    it("returns domains of existing squads", async () => {
      writeExistingSquad(tmpDir);
      const factory = new SquadFactory({ squadsPath: tmpDir, llmClient: mockLLMClient() });
      const domains = await factory.listDomains();
      expect(domains).toContain("juridico");
    });
  });
});

/**
 * SquadFactory — Detects domain from user messages and auto-generates
 * squads via LLM when they don't exist yet.
 *
 * Flow: detect domain → check if squad exists → call LLM → write files → emit XP
 */

import fs from "node:fs";
import path from "node:path";
import { getLogger } from "../logging/logger.js";
import { SquadLoader, DEFAULT_SQUADS_PATH } from "./squad-loader.js";
import type { SquadManifest } from "./squad-loader.js";
import type { LLMClient } from "./llm-client.js";

const log = getLogger();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SquadCreationResult {
  squad: SquadManifest;
  path: string;
  isNew: boolean;
  xpEarned: number;
  achievement?: string;
}

export interface SquadFactoryOptions {
  squadsPath?: string;
  llmClient: LLMClient;
  creationModel?: string;
}

// ─── Domain Keywords ──────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  juridico: [
    "contrato", "dívida", "serasa", "processo", "ação", "tribunal",
    "advogado", "lei", "direito", "cpf negativado", "justiça", "audiência",
    "recurso", "liminar", "mandado", "jurídico",
  ],
  financeiro: [
    "investimento", "bolsa", "ação", "fundo", "rendimento", "carteira",
    "aportar", "tesouro", "cdi", "selic", "dividendo", "renda fixa",
    "renda variável", "financeiro", "finança",
  ],
  saude: [
    "médico", "remédio", "sintoma", "consulta", "exame", "diagnóstico",
    "doença", "hospital", "saúde", "tratamento", "receita", "vacina",
  ],
  marketing: [
    "campanha", "copy", "anúncio", "post", "engajamento", "lead",
    "funil", "conversão", "marketing", "tráfego", "audiência", "branding",
  ],
  rh: [
    "currículo", "entrevista", "contratação", "demissão", "clt", "pj",
    "salário", "benefício", "férias", "rescisão", "recrutamento",
  ],
  tecnologia: [
    "bug", "código", "deploy", "servidor", "api", "banco de dados",
    "sistema", "programação", "software", "aplicativo", "site",
  ],
};

// ─── LLM Prompt ───────────────────────────────────────────────────────────────

function buildCreationPrompt(domain: string, context?: string): string {
  const contextLine = context ? `\nContexto adicional: ${context}` : "";

  return `Você é um especialista em criar equipes de agentes IA especializados.

Crie um Squad completo para o domínio: ${domain}${contextLine}

Responda APENAS com JSON válido, sem markdown, sem texto extra:

{
  "squad": {
    "name": "squad-${domain}",
    "version": "1.0.0",
    "description": "Squad especializado em ${domain}",
    "domain": "${domain}",
    "tags": ["tag1", "tag2"],
    "components": {
      "agents": ["agente1.md", "agente2.md", "agente3.md"]
    }
  },
  "agents": [
    {
      "filename": "agente1.md",
      "content": "name: agente1\\nversion: 1.0.0\\ndescription: ...\\npersona:\\n  name: Nome\\n  role: Papel\\n  expertise:\\n    - area1\\n    - area2\\npreferredModel: claude-sonnet-4-5\\nsystem_prompt: |\\n  Você é Nome, especialista em...\\n  \\n  Suas responsabilidades:\\n  - resp1\\n  - resp2\\n  \\n  Diretrizes:\\n  - Seja preciso e objetivo\\n  - Use linguagem brasileira\\n"
    }
  ],
  "xpEarned": 300,
  "achievement": "Squad ${capitalize(domain)} Forjado"
}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── LLM Response Parser ──────────────────────────────────────────────────────

interface LLMSquadResponse {
  squad: {
    name: string;
    version: string;
    description: string;
    domain: string;
    tags: string[];
    components: { agents: string[] };
  };
  agents: Array<{ filename: string; content: string }>;
  xpEarned: number;
  achievement: string;
}

function parseLLMResponse(raw: string): LLMSquadResponse {
  // Strip markdown fences if LLM wraps in ```json ... ```
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned) as LLMSquadResponse;

  if (!parsed.squad?.name || !Array.isArray(parsed.agents)) {
    throw new Error("LLM response missing required fields (squad.name, agents)");
  }

  return parsed;
}

// ─── File Writers ─────────────────────────────────────────────────────────────

function writeSquadYaml(squadDir: string, data: LLMSquadResponse["squad"]): void {
  const agentsList = data.components.agents.map((a) => `      - ${a}`).join("\n");
  const tagsList = data.tags.map((t) => `${t}`).join(", ");

  const yaml = `name: ${data.name}
version: ${data.version}
description: ${data.description}
domain: ${data.domain}
tags: [${tagsList}]
components:
  agents:
${agentsList}
`;

  fs.writeFileSync(path.join(squadDir, "squad.yaml"), yaml, "utf-8");
}

function writeAgentFiles(squadDir: string, agents: LLMSquadResponse["agents"]): void {
  const agentsDir = path.join(squadDir, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  for (const agent of agents) {
    // Unescape \\n to real newlines if LLM used JSON escaping
    const content = agent.content.replace(/\\n/g, "\n");
    fs.writeFileSync(path.join(agentsDir, agent.filename), content, "utf-8");
  }
}

function writeReadme(squadDir: string, data: LLMSquadResponse): void {
  const agentList = data.agents
    .map((a) => `- **${a.filename.replace(".md", "")}**`)
    .join("\n");

  const readme = `# ${data.squad.name}

${data.squad.description}

## Agentes

${agentList}

## Domínio

${data.squad.domain}

---
*Gerado automaticamente pelo Sistema Donna*
`;

  fs.writeFileSync(path.join(squadDir, "README.md"), readme, "utf-8");
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SquadFactoryError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "SquadFactoryError";
    this.code = code;
  }
}

// ─── Main Factory ─────────────────────────────────────────────────────────────

export class SquadFactory {
  private readonly squadsPath: string;
  private readonly llmClient: LLMClient;
  private readonly creationModel: string;
  private readonly loader: SquadLoader;

  constructor(options: SquadFactoryOptions) {
    this.squadsPath = options.squadsPath ?? DEFAULT_SQUADS_PATH;
    this.llmClient = options.llmClient;
    this.creationModel = options.creationModel ?? "claude-sonnet-4-5";
    this.loader = new SquadLoader(this.squadsPath);
  }

  /**
   * Detects domain from a user message using keyword matching.
   * Returns null if no domain matches.
   */
  detectDomain(message: string): string | null {
    const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const original = message.toLowerCase();

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized.includes(normalizedKw) || original.includes(kw)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = domain;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Returns existing squad or creates a new one via LLM.
   */
  async getOrCreate(domain: string, context?: string): Promise<SquadCreationResult> {
    const squadName = `squad-${domain}`;
    const exists = await this.loader.squadExists(squadName);

    if (exists) {
      const manifest = await this.loader.loadSquad(squadName);
      return {
        squad: manifest,
        path: path.join(this.squadsPath, squadName),
        isNew: false,
        xpEarned: 0,
      };
    }

    return this.create(domain, context);
  }

  /**
   * Creates a new squad. Throws if squad already exists.
   */
  async create(domain: string, context?: string): Promise<SquadCreationResult> {
    const squadName = `squad-${domain}`;
    const squadDir = path.join(this.squadsPath, squadName);

    if (fs.existsSync(path.join(squadDir, "squad.yaml"))) {
      throw new SquadFactoryError(
        `Squad "${squadName}" already exists at ${squadDir}`,
        "SQUAD_EXISTS",
      );
    }

    log.info(`[squads] Creating squad for domain "${domain}" via LLM...`);

    const prompt = buildCreationPrompt(domain, context);
    const response = await this.llmClient.call({
      model: this.creationModel,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4096,
      temperature: 0.7,
    });

    const data = parseLLMResponse(response.content);

    // Write files
    fs.mkdirSync(squadDir, { recursive: true });
    writeSquadYaml(squadDir, data.squad);
    writeAgentFiles(squadDir, data.agents);
    writeReadme(squadDir, data);

    log.info(`[squads] Squad "${squadName}" created at ${squadDir}`);

    // Load back through loader for consistency
    this.loader.clearCache();
    const manifest = await this.loader.loadSquad(squadName);

    return {
      squad: manifest,
      path: squadDir,
      isNew: true,
      xpEarned: data.xpEarned ?? 300,
      achievement: data.achievement ?? `Squad ${capitalize(domain)} Forjado`,
    };
  }

  /**
   * Lists all domains that already have squads.
   */
  async listDomains(): Promise<string[]> {
    const squads = await this.loader.listAll();
    return squads.map((s) => s.domain).filter(Boolean);
  }
}

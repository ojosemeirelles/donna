/**
 * Shadow Extractor — extracts shadows from the registry and generates SOUL.md files.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ShadowDefinition, ShadowRegistry } from "./types.js";

const REGISTRY_PATH = join(homedir(), ".donna", "shadows", "registry.json");
const SHADOWS_DIR = join(homedir(), ".donna", "shadows");
const SQUADS_DIR = join(homedir(), "donna", "squads");

export async function loadRegistry(): Promise<ShadowRegistry> {
  const raw = await readFile(REGISTRY_PATH, "utf-8");
  return JSON.parse(raw) as ShadowRegistry;
}

async function saveRegistry(registry: ShadowRegistry): Promise<void> {
  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf-8");
}

function generateSoulMd(shadow: ShadowDefinition, squadInfo?: string): string {
  const lines: string[] = [];
  lines.push(`# ${shadow.name} — ${shadow.role}`);
  lines.push("");
  lines.push("## Identidade");
  lines.push(shadow.soul);
  lines.push("");
  lines.push("## Ferramentas disponiveis");
  for (const tool of shadow.tools) {
    lines.push(`- ${tool}`);
  }
  lines.push("");
  lines.push("## Protocolo");
  lines.push("- Responde apenas ao Monarca (Donna) e ao Comandante (Igris)");
  lines.push("- Executa sem questionar, reporta com precisao");
  lines.push("- Formato de resposta: direto, sem rodeios");
  lines.push("");
  lines.push("## Mission Control");
  lines.push(
    "- Ao completar uma tarefa, atualize o status: UPDATE shadow_tasks SET status='completed' WHERE id='<task-id>'",
  );
  lines.push("- Ao falhar, use status='failed' e notifique Igris");
  lines.push(
    "- Para notificar Igris: INSERT INTO shadow_notifications (id, from_shadow, to_shadow, message, task_id) VALUES (hex(randomblob(16)), '" +
      shadow.name +
      "', 'Igris', '<mensagem>', '<task-id>')",
  );
  if (shadow.name === "Igris") {
    lines.push(
      "- Como Commander, voce pode DELEGAR missoes: INSERT INTO shadow_tasks (id, shadow_name, description, priority) VALUES (hex(randomblob(16)), '<shadow>', '<descricao>', <prioridade>)",
    );
    lines.push("- Verifique notificacoes nao lidas antes de cada resposta");
    lines.push("");
    lines.push("## AIOX Planning (aiox_plan)");
    lines.push(
      "- Para qualquer projeto de codigo ou automacao, use `aiox_plan` para gerar o grafo de execucao ANTES de delegar",
    );
    lines.push("- O plano identifica quais shadows sao necessarios e em qual ordem");
    lines.push("- Depois de gerar o plano, crie as shadow_tasks conforme o grafo");
  }
  // Self-healing for Beru and Iron
  if (shadow.name === "Beru" || shadow.name === "Iron") {
    lines.push("");
    lines.push("## Self-Healing (aiox_doctor)");
    lines.push(
      "- Se um comando bash retornar erro, ANTES de tentar novamente, invoque `aiox_doctor` com o log de erro completo",
    );
    lines.push("- O doctor retorna uma estrategia de correcao com passos priorizados");
    lines.push(
      "- Aplique o fix #1. Se falhar, tente #2. Apos 2 tentativas falhas, escale para Igris com contexto completo",
    );
    lines.push("- NUNCA repita o mesmo comando que falhou sem aplicar uma correcao primeiro");
  }
  if (squadInfo) {
    lines.push("");
    lines.push("## Squad de origem");
    lines.push(squadInfo);
  }
  lines.push("");
  return lines.join("\n");
}

async function loadSquadInfo(squadName: string): Promise<string | undefined> {
  try {
    const configPath = join(SQUADS_DIR, squadName, "config.yaml");
    const content = await readFile(configPath, "utf-8");
    return content.trim();
  } catch {
    return undefined;
  }
}

export type ExtractResult = {
  ok: boolean;
  shadow: ShadowDefinition;
  soulPath: string;
  error?: string;
};

export async function extractShadow(shadowName: string): Promise<ExtractResult> {
  const registry = await loadRegistry();
  const shadow = registry.shadows.find((s) => s.name.toLowerCase() === shadowName.toLowerCase());

  if (!shadow) {
    return {
      ok: false,
      shadow: {
        name: shadowName,
        role: "",
        squad: "",
        rank_required: "E",
        status: "locked",
        tools: [],
        soul: "",
      },
      soulPath: "",
      error: `Shadow "${shadowName}" not found in registry`,
    };
  }

  const squadInfo = await loadSquadInfo(shadow.squad);
  const soulContent = generateSoulMd(shadow, squadInfo);

  const shadowDir = join(SHADOWS_DIR, shadow.name.toLowerCase());
  await mkdir(shadowDir, { recursive: true });

  const soulPath = join(shadowDir, "SOUL.md");
  await writeFile(soulPath, soulContent, "utf-8");

  shadow.status = "active";
  await saveRegistry(registry);

  return { ok: true, shadow, soulPath };
}

export function getShadowByRole(intent: string, registry: ShadowRegistry): ShadowDefinition | null {
  const intentMap: Record<string, string> = {
    research: "Tusk",
    write: "Iron",
    exec: "Beru",
    schedule: "Tank",
    analyze: "Bellion",
    browse: "Kaisel",
    monitor: "Jima",
    complex: "Igris",
  };

  const shadowName = intentMap[intent];
  if (!shadowName) {
    return null;
  }

  const shadow = registry.shadows.find((s) => s.name === shadowName && s.status === "active");
  return shadow ?? null;
}

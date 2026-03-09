/**
 * Shadow Extractor — extracts shadows from the registry and generates SOUL.md files.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
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

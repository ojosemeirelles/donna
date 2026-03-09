/**
 * SquadLoader — Reads ~/.donna/squads/ and maintains a registry of active squads.
 *
 * Based on the AIOX squad-loader pattern: reads squad.yaml manifests,
 * parses agent .md files, and watches for changes at runtime.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getLogger } from "../logging/logger.js";

const log = getLogger();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentDefinition {
  name: string;
  role: string;
  expertise: string[];
  systemPrompt: string;
  preferredModel?: string;
}

export interface SquadManifest {
  name: string;
  version: string;
  description: string;
  domain: string;
  tags: string[];
  agents: AgentDefinition[];
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SquadLoadError extends Error {
  code: string;
  squadPath?: string;

  constructor(message: string, code: string, squadPath?: string) {
    super(message);
    this.name = "SquadLoadError";
    this.code = code;
    this.squadPath = squadPath;
  }
}

// ─── YAML-like Parser ─────────────────────────────────────────────────────────
// Minimal parser for squad.yaml and agent .md files.
// Avoids adding a YAML dependency — these files have simple flat structure.

function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey = "";
  let currentList: string[] | null = null;
  let multilineKey = "";
  let multilineValue = "";
  let inMultiline = false;
  let multilineIndent = 0;

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and blank lines (but not in multiline mode)
    if (!inMultiline && (line.trim().startsWith("#") || line.trim() === "")) {
      // Flush pending list
      if (currentList !== null) {
        result[currentKey] = currentList;
        currentList = null;
      }
      continue;
    }

    // Multiline string collection (key: |)
    if (inMultiline) {
      const indent = line.length - line.trimStart().length;
      if (indent >= multilineIndent && line.trim() !== "") {
        multilineValue += (multilineValue ? "\n" : "") + line.slice(multilineIndent);
        continue;
      }
      // End of multiline block
      result[multilineKey] = multilineValue;
      inMultiline = false;
      multilineValue = "";
      // Fall through to process current line
    }

    // List item (  - value)
    if (line.match(/^\s+-\s+/)) {
      const val = line.replace(/^\s+-\s+/, "").trim();
      if (currentList === null) {
        currentList = [];
      }
      currentList.push(val);
      continue;
    }

    // Flush pending list
    if (currentList !== null) {
      result[currentKey] = currentList;
      currentList = null;
    }

    // Key: value pair
    const kvMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
    if (kvMatch) {
      const [, indent, key, rawValue] = kvMatch;
      const trimmedValue = rawValue.trim();

      // Skip nested keys (indented) — we only parse top-level
      if (indent && indent.length > 0) {
        continue;
      }

      currentKey = key!;

      // Multiline indicator
      if (trimmedValue === "|") {
        multilineKey = currentKey;
        multilineIndent = 2;
        inMultiline = true;
        continue;
      }

      // Inline array [a, b, c]
      if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
        const items = trimmedValue
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
        result[currentKey] = items;
        continue;
      }

      // Remove quotes
      const value = trimmedValue.replace(/^['"]|['"]$/g, "");
      result[currentKey] = value;
    }
  }

  // Flush remaining
  if (currentList !== null) {
    result[currentKey] = currentList;
  }
  if (inMultiline && multilineValue) {
    result[multilineKey] = multilineValue;
  }

  return result;
}

// ─── Agent Parser ─────────────────────────────────────────────────────────────

function parseAgentFile(content: string, filename: string): AgentDefinition {
  const parsed = parseSimpleYaml(content);

  return {
    name: String(parsed.name ?? path.basename(filename, ".md")),
    role: String(parsed.role ?? parsed.description ?? ""),
    expertise: Array.isArray(parsed.expertise) ? parsed.expertise.map(String) : [],
    systemPrompt: String(parsed.system_prompt ?? ""),
    preferredModel: parsed.preferredModel ? String(parsed.preferredModel) : undefined,
  };
}

// ─── Squad Manifest Parser ────────────────────────────────────────────────────

function parseSquadYaml(content: string, squadDir: string): SquadManifest {
  const parsed = parseSimpleYaml(content);

  const name = String(parsed.name ?? path.basename(squadDir));
  const version = String(parsed.version ?? "1.0.0");
  const description = String(parsed.description ?? "");
  const domain = String(parsed.domain ?? "general");
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String) : [];

  // Load agent files
  const agentsDir = path.join(squadDir, "agents");
  const agents: AgentDefinition[] = [];

  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    for (const file of agentFiles) {
      try {
        const agentContent = fs.readFileSync(path.join(agentsDir, file), "utf-8");
        agents.push(parseAgentFile(agentContent, file));
      } catch (err) {
        log.warn(`[squads] Failed to parse agent ${file}: ${(err as Error).message}`);
      }
    }
  }

  return { name, version, description, domain, tags, agents };
}

// ─── Main Loader ──────────────────────────────────────────────────────────────

export const DEFAULT_SQUADS_PATH = path.join(os.homedir(), ".donna", "squads");

export class SquadLoader {
  private readonly squadsPath: string;
  private watcher: fs.FSWatcher | null = null;
  private cache: Map<string, SquadManifest> = new Map();

  constructor(squadsPath?: string) {
    this.squadsPath = squadsPath ?? DEFAULT_SQUADS_PATH;
  }

  getSquadsPath(): string {
    return this.squadsPath;
  }

  async listAll(): Promise<SquadManifest[]> {
    this.cache.clear();

    if (!fs.existsSync(this.squadsPath)) {
      return [];
    }

    const entries = fs.readdirSync(this.squadsPath, { withFileTypes: true });
    const squads: SquadManifest[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }

      try {
        const manifest = await this.loadSquad(entry.name);
        squads.push(manifest);
      } catch (err) {
        log.warn(`[squads] Skipping ${entry.name}: ${(err as Error).message}`);
      }
    }

    return squads;
  }

  async loadSquad(name: string): Promise<SquadManifest> {
    // Check cache
    const cached = this.cache.get(name);
    if (cached) {
      return cached;
    }

    const squadDir = path.join(this.squadsPath, name);

    if (!fs.existsSync(squadDir)) {
      throw new SquadLoadError(
        `Squad "${name}" not found at ${squadDir}`,
        "SQUAD_NOT_FOUND",
        squadDir,
      );
    }

    const yamlPath = path.join(squadDir, "squad.yaml");
    if (!fs.existsSync(yamlPath)) {
      throw new SquadLoadError(`Squad "${name}" missing squad.yaml`, "MISSING_MANIFEST", squadDir);
    }

    const content = fs.readFileSync(yamlPath, "utf-8");
    const manifest = parseSquadYaml(content, squadDir);

    this.cache.set(name, manifest);
    return manifest;
  }

  async squadExists(name: string): Promise<boolean> {
    const squadDir = path.join(this.squadsPath, name);
    const yamlPath = path.join(squadDir, "squad.yaml");
    return fs.existsSync(yamlPath);
  }

  watch(callback: (event: "added" | "removed", squad: SquadManifest) => void): void {
    this.stopWatch();

    if (!fs.existsSync(this.squadsPath)) {
      fs.mkdirSync(this.squadsPath, { recursive: true });
    }

    const knownSquads = new Set<string>();

    // Initial scan
    const entries = fs.readdirSync(this.squadsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const yamlPath = path.join(this.squadsPath, entry.name, "squad.yaml");
        if (fs.existsSync(yamlPath)) {
          knownSquads.add(entry.name);
        }
      }
    }

    this.watcher = fs.watch(this.squadsPath, { recursive: false }, (_event, filename) => {
      if (!filename || filename.startsWith(".")) {
        return;
      }

      const squadDir = path.join(this.squadsPath, filename);
      const yamlPath = path.join(squadDir, "squad.yaml");
      const exists = fs.existsSync(yamlPath);
      const wasKnown = knownSquads.has(filename);

      if (exists && !wasKnown) {
        knownSquads.add(filename);
        this.cache.delete(filename);
        this.loadSquad(filename)
          .then((manifest) => callback("added", manifest))
          .catch((err) => log.warn(`[squads] Watch load error: ${(err as Error).message}`));
      } else if (!exists && wasKnown) {
        knownSquads.delete(filename);
        const cached = this.cache.get(filename);
        this.cache.delete(filename);
        if (cached) {
          callback("removed", cached);
        }
      }
    });
  }

  stopWatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

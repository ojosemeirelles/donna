import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/home-assistant");

export interface HomeAssistantConfig {
  enabled: boolean;
  url: string;
  telegramChatId: string;
  monitorEntities: string[];
  automations: Array<{ trigger: string; action: string }>;
}

export interface HAToken {
  url: string;
  token: string;
}

export interface HAEntity {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: string;
}

export function getDefaultHAConfig(): HomeAssistantConfig {
  return {
    enabled: true,
    url: "",
    telegramChatId: "6008067521",
    monitorEntities: [],
    automations: [],
  };
}

export async function loadHAConfig(): Promise<HomeAssistantConfig> {
  // Try hook-specific config first, then fallback to ha-config.json
  const hookConfigPath = path.join(
    os.homedir(),
    ".donna",
    "hooks",
    "home-assistant",
    "config.json",
  );
  const fallbackPath = path.join(os.homedir(), ".donna", "ha-config.json");

  for (const configPath of [hookConfigPath, fallbackPath]) {
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      return { ...getDefaultHAConfig(), ...(JSON.parse(raw) as Partial<HomeAssistantConfig>) };
    } catch {
      // Try next path
    }
  }

  return getDefaultHAConfig();
}

export async function loadHAToken(): Promise<HAToken | null> {
  const tokenPath = path.join(os.homedir(), ".donna", "ha-config.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    const parsed = JSON.parse(raw) as HAToken;
    if (!parsed.url || !parsed.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getEntityState(
  url: string,
  token: string,
  entityId: string,
): Promise<HAEntity> {
  const res = await fetch(`${url}/api/states/${entityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HA get entity state failed for ${entityId}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    entityId: (data.entity_id as string) ?? entityId,
    state: (data.state as string) ?? "unknown",
    attributes: (data.attributes as Record<string, unknown>) ?? {},
    lastChanged: (data.last_changed as string) ?? "",
  };
}

export async function callService(
  url: string,
  token: string,
  domain: string,
  service: string,
  entityId: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const body = { entity_id: entityId, ...data };
  const res = await fetch(`${url}/api/services/${domain}/${service}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HA call service ${domain}.${service} failed: ${res.status} ${res.statusText}`);
  }
}

export async function getStates(url: string, token: string): Promise<HAEntity[]> {
  const res = await fetch(`${url}/api/states`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HA get states failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((entity) => ({
    entityId: (entity.entity_id as string) ?? "",
    state: (entity.state as string) ?? "unknown",
    attributes: (entity.attributes as Record<string, unknown>) ?? {},
    lastChanged: (entity.last_changed as string) ?? "",
  }));
}

/** Get domain emoji for entity display. */
function domainEmoji(entityId: string): string {
  const domain = entityId.split(".")[0];
  const emojiMap: Record<string, string> = {
    light: "\u{1F4A1}", // lightbulb
    climate: "\u{1F321}\uFE0F", // thermometer
    switch: "\u{1F50C}", // plug
    sensor: "\u{1F4CA}", // chart
    binary_sensor: "\u{1F514}", // bell
    lock: "\u{1F512}", // lock
    cover: "\u{1FA9F}", // window
    fan: "\u{1F32C}\uFE0F", // wind
    media_player: "\u{1F3B5}", // music
    camera: "\u{1F4F7}", // camera
    automation: "\u{2699}\uFE0F", // gear
    person: "\u{1F464}", // person
  };
  return emojiMap[domain ?? ""] ?? "\u{1F3E0}"; // house fallback
}

export function formatEntityStatus(entities: HAEntity[]): string {
  if (entities.length === 0) {
    return "No monitored entities found.";
  }

  const lines: string[] = ["*Home Assistant Status*\n"];
  for (const entity of entities) {
    const emoji = domainEmoji(entity.entityId);
    const friendlyName = (entity.attributes.friendly_name as string) ?? entity.entityId;
    const unit = (entity.attributes.unit_of_measurement as string) ?? "";
    const stateStr = unit ? `${entity.state} ${unit}` : entity.state;
    lines.push(`${emoji} *${friendlyName}*: ${stateStr}`);
  }

  return lines.join("\n");
}

/** Parse a simple natural language command into domain/service/entity. */
export async function executeCommand(
  command: string,
  config: HomeAssistantConfig,
): Promise<{ domain: string; service: string; entityId: string } | null> {
  const lower = command.toLowerCase().trim();

  // Simple pattern matching for common commands
  const patterns: Array<{ regex: RegExp; domain: string; service: string; entityPrefix: string }> =
    [
      // Portuguese
      {
        regex: /apag[ao]\s+(as\s+)?luzes?/i,
        domain: "light",
        service: "turn_off",
        entityPrefix: "light.",
      },
      {
        regex: /lig[ao]\s+(as\s+)?luzes?/i,
        domain: "light",
        service: "turn_on",
        entityPrefix: "light.",
      },
      {
        regex: /lig[ao]\s+(o\s+)?ar/i,
        domain: "climate",
        service: "turn_on",
        entityPrefix: "climate.",
      },
      {
        regex: /deslig[ao]\s+(o\s+)?ar/i,
        domain: "climate",
        service: "turn_off",
        entityPrefix: "climate.",
      },
      // English
      {
        regex: /turn\s+off\s+(the\s+)?lights?/i,
        domain: "light",
        service: "turn_off",
        entityPrefix: "light.",
      },
      {
        regex: /turn\s+on\s+(the\s+)?lights?/i,
        domain: "light",
        service: "turn_on",
        entityPrefix: "light.",
      },
      {
        regex: /turn\s+on\s+(the\s+)?ac/i,
        domain: "climate",
        service: "turn_on",
        entityPrefix: "climate.",
      },
      {
        regex: /turn\s+off\s+(the\s+)?ac/i,
        domain: "climate",
        service: "turn_off",
        entityPrefix: "climate.",
      },
    ];

  for (const pattern of patterns) {
    if (pattern.regex.test(lower)) {
      // Find the first matching entity from config
      const entityId = config.monitorEntities.find((e) => e.startsWith(pattern.entityPrefix));
      if (entityId) {
        return { domain: pattern.domain, service: pattern.service, entityId };
      }
      // If no specific entity, return the pattern with a generic entity
      return {
        domain: pattern.domain,
        service: pattern.service,
        entityId: `${pattern.entityPrefix}all`,
      };
    }
  }

  // Check for temperature query
  if (/temperatura|temperature|temp/i.test(lower)) {
    const climateEntity = config.monitorEntities.find((e) => e.startsWith("climate."));
    if (climateEntity) {
      return { domain: "climate", service: "query", entityId: climateEntity };
    }
  }

  return null;
}

export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadHAConfig();
    if (!config.enabled || !config.url) {
      return null;
    }
    const tokenData = await loadHAToken();
    if (!tokenData) {
      return null;
    }

    const summaryParts: string[] = [];

    for (const entityId of config.monitorEntities.slice(0, 5)) {
      try {
        const entity = await getEntityState(tokenData.url, tokenData.token, entityId);
        const friendlyName = (entity.attributes.friendly_name as string) ?? entity.entityId;
        const domain = entity.entityId.split(".")[0];

        if (domain === "climate") {
          const temp = entity.attributes.current_temperature as number | undefined;
          if (temp !== undefined) {
            summaryParts.push(`${friendlyName}: ${temp}\u00B0`);
          }
        } else if (domain === "sensor") {
          const unit = (entity.attributes.unit_of_measurement as string) ?? "";
          summaryParts.push(`${friendlyName}: ${entity.state}${unit ? ` ${unit}` : ""}`);
        } else if (domain === "binary_sensor" && entity.state === "on") {
          summaryParts.push(`${friendlyName}: active`);
        }
      } catch (err) {
        log.warn(
          `Failed to get entity ${entityId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (summaryParts.length === 0) {
      return null;
    }

    return `Home: ${summaryParts.join(", ")}`;
  } catch (err) {
    log.warn(
      `Morning brief HA summary failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

// Home Assistant hook does NOT register CronJobs by default (on-demand usage).
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const config = await loadHAConfig();
    if (!config.enabled) {
      log.debug("home-assistant is disabled — skipping");
      return;
    }

    if (!config.url) {
      log.debug(
        "home-assistant: no URL configured — hook loaded but no cron jobs registered (on-demand mode)",
      );
      return;
    }

    // Verify connectivity on startup
    const tokenData = await loadHAToken();
    if (!tokenData) {
      log.warn(
        "home-assistant: no token found in ~/.donna/ha-config.json — hook loaded but cannot connect",
      );
      return;
    }

    try {
      const res = await fetch(`${tokenData.url}/api/`, {
        headers: { Authorization: `Bearer ${tokenData.token}` },
      });
      if (res.ok) {
        log.info(
          `home-assistant connected to ${config.url} — on-demand mode (no cron jobs registered)`,
        );
      } else {
        log.warn(`home-assistant: API returned ${res.status} — check URL and token`);
      }
    } catch (err) {
      log.warn(
        `home-assistant: could not reach ${config.url} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`home-assistant startup check failed: ${message}`);
  }
};

export default handler;

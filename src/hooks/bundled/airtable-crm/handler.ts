import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/airtable-crm");

export const AIRTABLE_CRM_JOB_ID = "airtable-crm-check";

export type AirtableCrmConfig = {
  enabled: boolean;
  baseId: string;
  tableId: string;
  telegramChatId: string;
  /** Number of days without contact before a lead is considered stale — default: 3 */
  staleDays: number;
  /** Check interval in minutes — default: 60 */
  checkIntervalMinutes: number;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  lastContactDate: string | null;
  createdAt: string;
};

type AirtableToken = {
  token: string;
};

const DONNA_DIR = path.join(os.homedir(), ".donna");
const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

function getDefaultAirtableConfig(): AirtableCrmConfig {
  return {
    enabled: true,
    baseId: "",
    tableId: "",
    telegramChatId: "6008067521",
    staleDays: 3,
    checkIntervalMinutes: 60,
  };
}

export async function loadAirtableConfig(): Promise<AirtableCrmConfig> {
  const configPath = path.join(DONNA_DIR, "hooks", "airtable-crm", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultAirtableConfig(), ...(JSON.parse(raw) as Partial<AirtableCrmConfig>) };
  } catch {
    return getDefaultAirtableConfig();
  }
}

export async function loadAirtableToken(): Promise<AirtableToken> {
  const tokenPath = path.join(DONNA_DIR, "airtable-token.json");
  const raw = await fs.readFile(tokenPath, "utf-8");
  return JSON.parse(raw) as AirtableToken;
}

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records: AirtableRecord[];
  offset?: string;
};

export async function listRecords(
  token: string,
  baseId: string,
  tableId: string,
  formula?: string,
): Promise<AirtableRecord[]> {
  const url = new URL(`${AIRTABLE_API_BASE}/${baseId}/${tableId}`);
  if (formula) {
    url.searchParams.set("filterByFormula", formula);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AirtableListResponse;
  return data.records;
}

export async function createRecord(
  token: string,
  baseId: string,
  tableId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const url = `${AIRTABLE_API_BASE}/${baseId}/${tableId}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Airtable create error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as AirtableRecord;
}

export async function updateRecord(
  token: string,
  baseId: string,
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const url = `${AIRTABLE_API_BASE}/${baseId}/${tableId}/${recordId}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Airtable update error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as AirtableRecord;
}

function fieldStr(val: unknown): string {
  if (val == null) {
    return "";
  }
  if (typeof val === "string") {
    return val;
  }
  return JSON.stringify(val);
}

function recordToLead(record: AirtableRecord): Lead {
  const f = record.fields;
  return {
    id: record.id,
    name: fieldStr(f.Name ?? f.name),
    email: fieldStr(f.Email ?? f.email),
    company: fieldStr(f.Company ?? f.company),
    status: fieldStr(f.Status ?? f.status),
    lastContactDate: (f.LastContactDate ?? f.lastContactDate ?? null) as string | null,
    createdAt: fieldStr(f.CreatedAt ?? f.createdAt ?? f.Created),
  };
}

export async function getStaleLeads(token: string, config: AirtableCrmConfig): Promise<Lead[]> {
  const staleDays = config.staleDays ?? 3;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleDays);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  // Fetch all records and filter client-side for broad compatibility
  // (Airtable formula syntax varies by field type)
  const records = await listRecords(token, config.baseId, config.tableId);
  const leads = records.map(recordToLead);

  return leads.filter((lead) => {
    if (!lead.lastContactDate) {
      return true; // Never contacted = stale
    }
    return lead.lastContactDate < cutoffStr;
  });
}

export function formatLeadList(leads: Lead[]): string {
  if (leads.length === 0) {
    return "No leads found.";
  }

  return leads
    .map((l) => {
      const contact = l.lastContactDate ?? "never";
      return `- ${l.name} (${l.company}) — ${l.status} — last contact: ${contact}`;
    })
    .join("\n");
}

export function formatStaleAlert(leads: Lead[]): string {
  if (leads.length === 0) {
    return "No stale leads.";
  }

  const lines: string[] = [`Stale Lead Alert: ${leads.length} lead(s) need follow-up`, ""];

  for (const lead of leads) {
    const contact = lead.lastContactDate ?? "never";
    lines.push(`  ${lead.name} (${lead.company}) — last contact: ${contact}`);
  }

  return lines.join("\n");
}

/** Returns lead pipeline summary for the morning brief, or null if unavailable. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadAirtableConfig();
    if (!config.enabled || !config.baseId || !config.tableId) {
      return null;
    }

    const { token } = await loadAirtableToken();
    const records = await listRecords(token, config.baseId, config.tableId);
    const staleLeads = await getStaleLeads(token, config);

    return `${records.length} leads in pipeline, ${staleLeads.length} stale`;
  } catch {
    return null;
  }
}

function buildAirtableCrmJob(config: AirtableCrmConfig): CronJob {
  const intervalMs = (config.checkIntervalMinutes ?? 60) * 60 * 1000;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: AIRTABLE_CRM_JOB_ID,
    agentId: "main",
    name: "Airtable CRM Stale Lead Check",
    description: "Check Airtable CRM for leads that need follow-up",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        `Check Airtable CRM (base: ${config.baseId}, table: ${config.tableId}) for stale leads. ` +
        `A lead is stale if not contacted in ${config.staleDays ?? 3} days. ` +
        "Report any stale leads that need follow-up.",
      lightContext: true,
      deliver: hasDelivery,
      ...(hasDelivery ? { channel: "telegram" as const, to: config.telegramChatId } : {}),
    },
    ...(hasDelivery
      ? {
          delivery: {
            mode: "announce" as const,
            channel: "telegram" as const,
            to: config.telegramChatId,
            bestEffort: true,
          },
        }
      : {}),
    failureAlert: false,
    state: {},
  };
}

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const config = await loadAirtableConfig();
    if (!config.enabled) {
      log.debug("airtable-crm hook disabled — skipping registration");
      return;
    }

    if (!config.baseId || !config.tableId) {
      log.warn(
        "airtable-crm: no baseId/tableId configured — set them in ~/.donna/hooks/airtable-crm/config.json",
      );
      return;
    }

    const job = buildAirtableCrmJob(config);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === AIRTABLE_CRM_JOB_ID);
    if (exists) {
      log.debug("airtable-crm-check cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const intervalMin = config.checkIntervalMinutes ?? 60;
    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured)";

    log.info(
      `airtable-crm-check registered: every ${intervalMin}min${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register airtable-crm-check cron job: ${message}`);
  }
};

export default handler;

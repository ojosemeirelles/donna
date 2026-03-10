/**
 * Google Calendar Hook — daily agenda summary, conflict detection, event queries.
 * Reuses existing Google OAuth from src/infra/google-auth.ts.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { getAccessToken } from "../../../infra/google-auth.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/google-calendar");

export const CALENDAR_DAILY_JOB_ID = "google-calendar-daily";

export type GoogleCalendarConfig = {
  enabled: boolean;
  /** Cron expression for daily summary — default: "0 8 * * *" (8:00 AM) */
  dailySummaryTime: string;
  telegramChatId: string;
  /** Calendar IDs to query — default: ["primary"] */
  calendarIds: string[];
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  htmlLink?: string;
};

export type CalendarConflict = {
  eventA: CalendarEvent;
  eventB: CalendarEvent;
  overlapMinutes: number;
};

type CalendarApiResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
    htmlLink?: string;
  }>;
};

export function getDefaultCalendarConfig(): GoogleCalendarConfig {
  return {
    enabled: false,
    dailySummaryTime: "0 8 * * *",
    telegramChatId: "6008067521",
    calendarIds: ["primary"],
  };
}

export async function loadCalendarConfig(stateDir?: string): Promise<GoogleCalendarConfig> {
  const dir = stateDir ?? path.join(os.homedir(), ".donna");
  const configPath = path.join(dir, "hooks", "google-calendar", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GoogleCalendarConfig>;
    return { ...getDefaultCalendarConfig(), ...parsed };
  } catch {
    return getDefaultCalendarConfig();
  }
}

export async function saveCalendarConfig(
  config: GoogleCalendarConfig,
  stateDir?: string,
): Promise<void> {
  const dir = stateDir ?? path.join(os.homedir(), ".donna");
  const configDir = path.join(dir, "hooks", "google-calendar");
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    path.join(configDir, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
    "utf-8",
  );
}

function parseEventTime(ev: { dateTime?: string; date?: string }): string {
  return ev.dateTime ?? ev.date ?? "";
}

function parseApiEvent(item: NonNullable<CalendarApiResponse["items"]>[number]): CalendarEvent {
  return {
    id: item.id ?? "",
    summary: item.summary ?? "(no title)",
    start: parseEventTime(item.start ?? {}),
    end: parseEventTime(item.end ?? {}),
    location: item.location,
    description: item.description,
    htmlLink: item.htmlLink,
  };
}

/** Fetch today's events from Google Calendar API. */
export async function listTodayEvents(calendarId = "primary"): Promise<CalendarEvent[]> {
  const token = await getAccessToken();

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const timeMax = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  ).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as CalendarApiResponse;
  return (data.items ?? []).map(parseApiEvent);
}

/** Fetch upcoming events for the next N days. */
export async function listUpcomingEvents(
  days: number,
  calendarId = "primary",
): Promise<CalendarEvent[]> {
  const token = await getAccessToken();

  const now = new Date();
  const timeMin = now.toISOString();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const timeMax = futureDate.toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as CalendarApiResponse;
  return (data.items ?? []).map(parseApiEvent);
}

/** Detect overlapping events. */
export function detectConflicts(events: CalendarEvent[]): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];

  // Filter to timed events only (skip all-day)
  const timed = events.filter((e) => e.start.includes("T"));
  const sorted = [...timed].toSorted(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aEnd = new Date(a.end).getTime();
      const bStart = new Date(b.start).getTime();

      if (bStart < aEnd) {
        const bEnd = new Date(b.end).getTime();
        const overlapEnd = Math.min(aEnd, bEnd);
        const overlapStart = Math.max(new Date(a.start).getTime(), bStart);
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60_000);

        if (overlapMinutes > 0) {
          conflicts.push({ eventA: a, eventB: b, overlapMinutes });
        }
      }
    }
  }

  return conflicts;
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

/** Format a daily summary for Telegram. */
export function formatDailySummary(events: CalendarEvent[], conflicts: CalendarConflict[]): string {
  const lines: string[] = [];

  if (events.length === 0) {
    lines.push("Nenhum evento agendado para hoje.");
    return lines.join("\n");
  }

  lines.push(`*Agenda de hoje — ${events.length} evento(s):*`);
  lines.push("");

  for (const ev of events) {
    const isAllDay = !ev.start.includes("T");
    if (isAllDay) {
      lines.push(`  Dia inteiro — *${ev.summary}*`);
    } else {
      lines.push(`  ${formatTime(ev.start)} - ${formatTime(ev.end)} — *${ev.summary}*`);
    }
    if (ev.location) {
      lines.push(`    ${ev.location}`);
    }
  }

  if (conflicts.length > 0) {
    lines.push("");
    lines.push(`*${conflicts.length} conflito(s) detectado(s):*`);
    for (const c of conflicts) {
      lines.push(
        `  "${c.eventA.summary}" e "${c.eventB.summary}" (${c.overlapMinutes} min sobrepostos)`,
      );
    }
  }

  return lines.join("\n");
}

/** Morning brief integration — returns a formatted calendar section or null. */
export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadCalendarConfig();
    if (!config.enabled) {
      return null;
    }

    const allEvents: CalendarEvent[] = [];
    for (const calId of config.calendarIds) {
      const events = await listTodayEvents(calId);
      allEvents.push(...events);
    }

    if (allEvents.length === 0) {
      return null;
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const conflicts = detectConflicts(allEvents);
    return formatDailySummary(allEvents, conflicts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`morning brief calendar summary failed: ${message}`);
    return null;
  }
}

/** Build the daily summary prompt for the cron job. */
function buildDailySummaryPrompt(): string {
  return [
    "You are Donna. Fetch today's Google Calendar events using the google-calendar hook.",
    "List all events with times, detect any scheduling conflicts.",
    "Format a clear summary with emojis for Telegram delivery.",
    "Include prep notes for meetings when context is available.",
    "If no events, send a brief 'clear schedule' message.",
  ].join("\n");
}

/** Build the CronJob for daily calendar summary. */
function buildCalendarDailyJob(config: GoogleCalendarConfig): CronJob {
  const now = Date.now();

  return {
    id: CALENDAR_DAILY_JOB_ID,
    agentId: "main",
    name: "Google Calendar Daily Summary",
    description: "Daily calendar summary with conflict detection",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: "cron",
      expr: config.dailySummaryTime,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: buildDailySummaryPrompt(),
      lightContext: true,
      deliver: true,
      channel: "telegram" as const,
      to: config.telegramChatId,
    },
    delivery: {
      mode: "announce" as const,
      channel: "telegram" as const,
      to: config.telegramChatId,
      bestEffort: true,
    },
    failureAlert: false,
    state: {},
  };
}

/**
 * Register the google-calendar cron job on gateway startup.
 * Idempotent: skips if the job already exists.
 */
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const stateDir = resolveStateDir(process.env, os.homedir);
    const config = await loadCalendarConfig(stateDir);

    if (!config.enabled) {
      log.info("google-calendar disabled in config — skipping registration");
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === CALENDAR_DAILY_JOB_ID);
    if (exists) {
      log.debug("google-calendar daily job already registered — skipping");
      return;
    }

    store.jobs.push(buildCalendarDailyJob(config));
    await saveCronStore(storePath, store);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId — set in ~/.donna/hooks/google-calendar/config.json)";

    log.info(
      `google-calendar registered: ${config.dailySummaryTime} [${tz}]${chatNote}. Restart gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register google-calendar cron job: ${message}`);
  }
};

export default handler;

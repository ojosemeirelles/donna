import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/morning-brief");

export const MORNING_BRIEF_JOB_ID = "morning-brief-daily";

export type MorningBriefSources = {
  email?: boolean;
  calendar?: boolean;
  tasks?: boolean;
};

export type MorningBriefConfig = {
  /** Cron expression — default: "0 7 * * *" (7:00 AM daily) */
  time?: string;
  /** IANA timezone — default: system timezone */
  timezone?: string;
  /** Language code — default: "pt" (Portuguese) */
  language?: string;
  /** Telegram chat ID for delivery */
  telegramChatId?: string;
  /** Which data sources to include */
  sources?: MorningBriefSources;
};

/** Load config from ~/.donna/hooks/morning-brief/config.json, falling back to defaults. */
export async function loadMorningBriefConfig(stateDir: string): Promise<MorningBriefConfig> {
  const configPath = path.join(stateDir, "hooks", "morning-brief", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return JSON.parse(raw) as MorningBriefConfig;
  } catch {
    // File missing or unparseable — use defaults.
    return {};
  }
}

/** Build the agent prompt for the morning brief. */
export function buildMorningBriefPrompt(config: MorningBriefConfig): string {
  const lang = config.language ?? "pt";
  const sources = config.sources ?? {};
  const includeEmail = sources.email !== false;
  const includeCalendar = sources.calendar !== false;
  const includeTasks = sources.tasks !== false;

  const header =
    lang === "pt"
      ? [
          "Você é a assistente Donna. Prepare e envie o **resumo matinal** seguindo as instruções abaixo.",
          "Use emojis para facilitar a leitura no celular. Responda em português.",
          "Se uma fonte estiver indisponível, escreva _(indisponível)_ nessa seção e continue.",
          "",
          "Comece com: ☀️ *Bom dia! Aqui está seu resumo de hoje:*",
          "",
        ]
      : [
          "You are Donna. Prepare and send the **morning brief** following the instructions below.",
          "Use emojis for easy mobile reading. Reply in English.",
          "If a source is unavailable, write _(unavailable)_ for that section and continue.",
          "",
          "Start with: ☀️ *Good morning! Here is your daily summary:*",
          "",
        ];

  const sections: string[] = [];

  if (includeEmail) {
    sections.push(
      lang === "pt"
        ? [
            "## 📧 E-mails Prioritários",
            "Liste os **5 e-mails não lidos mais importantes** das últimas 24 horas.",
            "Use himalaya ou a ferramenta de e-mail configurada.",
            "Para cada e-mail: `• **Remetente** — Assunto (uma linha de resumo)`",
            "",
          ].join("\n")
        : [
            "## 📧 Priority Emails",
            "List the **top 5 unread emails** from the last 24 hours.",
            "Use himalaya or the configured email tool.",
            "For each: `• **Sender** — Subject (one-line summary)`",
            "",
          ].join("\n"),
    );
  }

  if (includeCalendar) {
    sections.push(
      lang === "pt"
        ? [
            "## 📅 Agenda de Hoje",
            "Liste todos os eventos de hoje com horário.",
            "Para cada reunião, adicione uma nota de preparação curta.",
            "Formato: `• HH:MM — **Título** → Prep: [o que preparar]`",
            "",
          ].join("\n")
        : [
            "## 📅 Today's Calendar",
            "List all events today with times.",
            "For each meeting, add a short prep note.",
            "Format: `• HH:MM — **Title** → Prep: [what to prepare]`",
            "",
          ].join("\n"),
    );
  }

  if (includeTasks) {
    sections.push(
      lang === "pt"
        ? [
            "## ✅ Top 3 Tarefas",
            "Liste as **3 tarefas mais urgentes** pendentes.",
            "Use apple-reminders, things-mac, notion, trello ou a ferramenta disponível.",
            "Numere e inclua uma linha de contexto para cada.",
            "",
          ].join("\n")
        : [
            "## ✅ Top 3 Tasks",
            "List the **3 most urgent pending tasks**.",
            "Use apple-reminders, things-mac, notion, trello, or whatever is available.",
            "Number them and include one line of context each.",
            "",
          ].join("\n"),
    );
  }

  sections.push(
    lang === "pt"
      ? [
          "## 🎯 Foco do Dia",
          "Com base em tudo acima, defina **uma única coisa** mais importante para fazer hoje.",
          "Seja específico e direto. Formato: `🎯 *Foco: [frase acionável]*`",
          "",
          "Finalize com uma frase motivacional curta em itálico.",
        ].join("\n")
      : [
          "## 🎯 Focus of the Day",
          "Based on the above, identify **one single thing** that would make today a success.",
          "Be specific. Format: `🎯 *Focus: [actionable phrase]*`",
          "",
          "End with a short motivational line in italics.",
        ].join("\n"),
  );

  return [...header, ...sections].join("\n");
}

/** Build the full CronJob record to write into the cron store. */
export function buildMorningBriefJob(config: MorningBriefConfig): CronJob {
  const cronExpr = config.time ?? "0 7 * * *";
  const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const prompt = buildMorningBriefPrompt(config);
  const now = Date.now();

  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: MORNING_BRIEF_JOB_ID,
    agentId: "main",
    name: "Morning Brief",
    description: "Daily morning summary with emails, calendar, tasks, and focus of the day",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "cron", expr: cronExpr, tz },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: prompt,
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

/**
 * Register the morning-brief cron job on gateway startup.
 *
 * Idempotent: skips registration if a job with the same ID already exists.
 * The cron job activates on the next gateway restart after first registration.
 */
const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const stateDir = resolveStateDir(process.env, os.homedir);
    const config = await loadMorningBriefConfig(stateDir);
    const job = buildMorningBriefJob(config);

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === MORNING_BRIEF_JOB_ID);
    if (exists) {
      log.debug("morning-brief cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const cronExpr = config.time ?? "0 7 * * *";
    const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const chatNote = config.telegramChatId
      ? ` → Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured — set it in ~/.donna/hooks/morning-brief/config.json)";

    log.info(
      `morning-brief registered: ${cronExpr} [${tz}]${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register morning-brief cron job: ${message}`);
  }
};

export default handler;

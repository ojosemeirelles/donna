import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../../../config/paths.js";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import { getMorningBriefSoul } from "../../../soul/engine.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/morning-brief");

export const MORNING_BRIEF_JOB_ID = "morning-brief-daily";

export type MorningBriefSources = {
  email?: boolean;
  calendar?: boolean;
  tasks?: boolean;
  finance?: boolean;
  analytics?: boolean;
  github?: boolean;
  shopify?: boolean;
  crm?: boolean;
  slack?: boolean;
  social?: boolean;
  soul?: boolean;
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
export async function buildMorningBriefPrompt(config: MorningBriefConfig): Promise<string> {
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

  const includeFinance = sources.finance !== false;
  const includeAnalytics = sources.analytics !== false;
  const includeGithub = sources.github !== false;
  const includeShopify = sources.shopify === true;
  const includeCrm = sources.crm === true;
  const includeSlack = sources.slack === true;
  const includeSocial = sources.social === true;

  if (includeFinance) {
    sections.push(
      lang === "pt"
        ? [
            "## 💳 Resumo Financeiro",
            "Consulte o hook stripe-monitor para dados de receita.",
            "Mostre: pagamentos recebidos nas últimas 24h, MRR atual, alertas de chargeback.",
            "Formato: `💰 Receita 24h: €X | MRR: €Y | Alertas: N`",
            "",
          ].join("\n")
        : [
            "## 💳 Financial Summary",
            "Check stripe-monitor hook for revenue data.",
            "Show: payments in last 24h, current MRR, chargeback alerts.",
            "Format: `💰 24h Revenue: €X | MRR: €Y | Alerts: N`",
            "",
          ].join("\n"),
    );
  }

  if (includeAnalytics) {
    sections.push(
      lang === "pt"
        ? [
            "## 📊 Tráfego do Site",
            "Consulte o hook analytics-report para dados de GA4.",
            "Mostre: sessões, usuários, pageviews das últimas 24h. Alerte se queda > 30%.",
            "Formato: `📈 Sessões: X | Usuários: Y | Views: Z`",
            "",
          ].join("\n")
        : [
            "## 📊 Website Traffic",
            "Check analytics-report hook for GA4 data.",
            "Show: sessions, users, pageviews from last 24h. Alert if drop > 30%.",
            "Format: `📈 Sessions: X | Users: Y | Views: Z`",
            "",
          ].join("\n"),
    );
  }

  if (includeGithub) {
    sections.push(
      lang === "pt"
        ? [
            "## 🐙 GitHub",
            "Consulte o hook github-monitor para atividade dos repos.",
            "Mostre: PRs abertos, issues novas, status do CI.",
            "Formato: `🔀 PRs: X abertos | Issues: Y novas | CI: ✅/❌`",
            "",
          ].join("\n")
        : [
            "## 🐙 GitHub",
            "Check github-monitor hook for repo activity.",
            "Show: open PRs, new issues, CI status.",
            "Format: `🔀 PRs: X open | Issues: Y new | CI: ✅/❌`",
            "",
          ].join("\n"),
    );
  }

  if (includeShopify) {
    sections.push(
      lang === "pt"
        ? [
            "## 🛒 Loja Online",
            "Consulte o hook shopify-dashboard.",
            "Mostre: pedidos do dia, receita, produtos com estoque baixo.",
            "",
          ].join("\n")
        : [
            "## 🛒 Online Store",
            "Check shopify-dashboard hook.",
            "Show: today's orders, revenue, low stock products.",
            "",
          ].join("\n"),
    );
  }

  if (includeCrm) {
    sections.push(
      lang === "pt"
        ? [
            "## 🗂️ CRM / Leads",
            "Consulte o hook airtable-crm.",
            "Mostre: leads não contatados há mais de 3 dias, pipeline resumido.",
            "",
          ].join("\n")
        : [
            "## 🗂️ CRM / Leads",
            "Check airtable-crm hook.",
            "Show: leads not contacted in 3+ days, pipeline summary.",
            "",
          ].join("\n"),
    );
  }

  if (includeSlack) {
    sections.push(
      lang === "pt"
        ? [
            "## 💬 Slack",
            "Consulte o hook slack-bridge para mensagens urgentes.",
            "Mostre: canais com atividade relevante, mensagens urgentes pendentes.",
            "",
          ].join("\n")
        : [
            "## 💬 Slack",
            "Check slack-bridge hook for urgent messages.",
            "Show: channels with relevant activity, pending urgent messages.",
            "",
          ].join("\n"),
    );
  }

  if (includeSocial) {
    sections.push(
      lang === "pt"
        ? [
            "## 📣 Social Media",
            "Consulte o hook social-poster.",
            "Mostre: posts agendados para hoje, performance dos últimos posts.",
            "",
          ].join("\n")
        : [
            "## 📣 Social Media",
            "Check social-poster hook.",
            "Show: posts scheduled for today, recent post performance.",
            "",
          ].join("\n"),
    );
  }

  // SOUL Engine section — live data from soul profile
  const includeSoul = sources.soul !== false;
  if (includeSoul) {
    try {
      const soulData = await getMorningBriefSoul();
      if (soulData) {
        sections.push(
          lang === "pt"
            ? [
                "## 🧠 Soul — Seu Estado Interno",
                "Use estes dados reais do perfil emocional para personalizar o resumo:",
                "",
                soulData,
                "",
                "Incorpore esses insights nas recomendações do dia — adapte o tom e as sugestões ao estado emocional atual.",
                "",
              ].join("\n")
            : [
                "## 🧠 Soul — Your Inner State",
                "Use this real emotional profile data to personalize the brief:",
                "",
                soulData,
                "",
                "Weave these insights into today's recommendations — adapt tone and suggestions to current emotional state.",
                "",
              ].join("\n"),
        );
      }
    } catch {
      // SOUL data unavailable — skip section silently
    }
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
export async function buildMorningBriefJob(config: MorningBriefConfig): Promise<CronJob> {
  const cronExpr = config.time ?? "0 7 * * *";
  const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const prompt = await buildMorningBriefPrompt(config);
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
    const job = await buildMorningBriefJob(config);

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

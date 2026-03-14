import crypto from "node:crypto";
import { resolveSessionAuthProfileOverride } from "../../agents/auth-profiles/session-override.js";
import type { ExecToolDefaults } from "../../agents/bash-tools.js";
import {
  abortEmbeddedPiRun,
  isEmbeddedPiRunActive,
  isEmbeddedPiRunStreaming,
  resolveEmbeddedSessionLane,
  runEmbeddedPiAgent,
} from "../../agents/pi-embedded.js";
import type { DonnaConfig } from "../../config/config.js";
import {
  resolveGroupSessionKey,
  resolveSessionFilePath,
  resolveSessionFilePathOptions,
  type SessionEntry,
  updateSessionStore,
} from "../../config/sessions.js";
import {
  EvolutionTracker,
  evaluateProgression,
  getLevelDefinition,
  getRankForLevel,
} from "../../evolution/index.js";
import { logVerbose } from "../../globals.js";
import { listRecentEmails, loadTokens } from "../../infra/google-auth.js";
import { getGlobalMemoryOrchestrator } from "../../memory/memory-orchestrator-singleton.js";
import { clearCommandLane, getQueueSize } from "../../process/command-queue.js";
import { normalizeMainKey } from "../../routing/session-key.js";
import {
  orchestrate,
  getShadowArmyStatus,
  isSoulIntent,
  classifyIntent,
} from "../../shadows/orchestrator.js";
import { checkShadowUnlocks, formatShadowUnlockMessage } from "../../shadows/rank-unlock.js";
import { dispatch as dispatchShadow, type DispatchDeps } from "../../shadows/session-manager.js";
import { processMessage as processSoulMessage, handleSoulCommand } from "../../soul/engine.js";
import { isReasoningTagProvider } from "../../utils/provider-utils.js";
import { hasControlCommand } from "../command-detection.js";
import { buildInboundMediaNote } from "../media-note.js";
import type { MsgContext, TemplateContext } from "../templating.js";
import {
  type ElevatedLevel,
  formatXHighModelHint,
  normalizeThinkLevel,
  type ReasoningLevel,
  supportsXHighThinking,
  type ThinkLevel,
  type VerboseLevel,
} from "../thinking.js";
import { SILENT_REPLY_TOKEN } from "../tokens.js";
import type { GetReplyOptions, ReplyPayload } from "../types.js";
import { runReplyAgent } from "./agent-runner.js";
import { applySessionHints } from "./body.js";
import type { buildCommandContext } from "./commands.js";
import type { InlineDirectives } from "./directive-handling.js";
import { buildGroupChatContext, buildGroupIntro } from "./groups.js";
import { buildInboundMetaSystemPrompt, buildInboundUserContextPrefix } from "./inbound-meta.js";
import type { createModelSelectionState } from "./model-selection.js";
import { resolveOriginMessageProvider } from "./origin-routing.js";
import { resolveQueueSettings } from "./queue.js";
import { routeReply } from "./route-reply.js";
import { buildBareSessionResetPrompt } from "./session-reset-prompt.js";
import { buildQueuedSystemPrompt, ensureSkillSnapshot } from "./session-updates.js";
import { resolveTypingMode } from "./typing-mode.js";
import { resolveRunTypingPolicy } from "./typing-policy.js";
import type { TypingController } from "./typing.js";
import { appendUntrustedContext } from "./untrusted-context.js";

type AgentDefaults = NonNullable<DonnaConfig["agents"]>["defaults"];
type ExecOverrides = Pick<ExecToolDefaults, "host" | "security" | "ask" | "node">;

function buildResetSessionNoticeText(params: {
  provider: string;
  model: string;
  defaultProvider: string;
  defaultModel: string;
}): string {
  const modelLabel = `${params.provider}/${params.model}`;
  const defaultLabel = `${params.defaultProvider}/${params.defaultModel}`;
  return modelLabel === defaultLabel
    ? `✅ New session started · model: ${modelLabel}`
    : `✅ New session started · model: ${modelLabel} (default: ${defaultLabel})`;
}

function resolveResetSessionNoticeRoute(params: {
  ctx: MsgContext;
  command: ReturnType<typeof buildCommandContext>;
}): {
  channel: Parameters<typeof routeReply>[0]["channel"];
  to: string;
} | null {
  const commandChannel = params.command.channel?.trim().toLowerCase();
  const fallbackChannel =
    commandChannel && commandChannel !== "webchat"
      ? (commandChannel as Parameters<typeof routeReply>[0]["channel"])
      : undefined;
  const channel = params.ctx.OriginatingChannel ?? fallbackChannel;
  const to = params.ctx.OriginatingTo ?? params.command.from ?? params.command.to;
  if (!channel || channel === "webchat" || !to) {
    return null;
  }
  return { channel, to };
}

async function sendResetSessionNotice(params: {
  ctx: MsgContext;
  command: ReturnType<typeof buildCommandContext>;
  sessionKey: string;
  cfg: DonnaConfig;
  accountId: string | undefined;
  threadId: string | number | undefined;
  provider: string;
  model: string;
  defaultProvider: string;
  defaultModel: string;
}): Promise<void> {
  const route = resolveResetSessionNoticeRoute({
    ctx: params.ctx,
    command: params.command,
  });
  if (!route) {
    return;
  }
  await routeReply({
    payload: {
      text: buildResetSessionNoticeText({
        provider: params.provider,
        model: params.model,
        defaultProvider: params.defaultProvider,
        defaultModel: params.defaultModel,
      }),
    },
    channel: route.channel,
    to: route.to,
    sessionKey: params.sessionKey,
    accountId: params.accountId,
    threadId: params.threadId,
    cfg: params.cfg,
  });
}

type RunPreparedReplyParams = {
  ctx: MsgContext;
  sessionCtx: TemplateContext;
  cfg: DonnaConfig;
  agentId: string;
  agentDir: string;
  agentCfg: AgentDefaults;
  sessionCfg: DonnaConfig["session"];
  commandAuthorized: boolean;
  command: ReturnType<typeof buildCommandContext>;
  commandSource: string;
  allowTextCommands: boolean;
  directives: InlineDirectives;
  defaultActivation: Parameters<typeof buildGroupIntro>[0]["defaultActivation"];
  resolvedThinkLevel: ThinkLevel | undefined;
  resolvedVerboseLevel: VerboseLevel | undefined;
  resolvedReasoningLevel: ReasoningLevel;
  resolvedElevatedLevel: ElevatedLevel;
  execOverrides?: ExecOverrides;
  elevatedEnabled: boolean;
  elevatedAllowed: boolean;
  blockStreamingEnabled: boolean;
  blockReplyChunking?: {
    minChars: number;
    maxChars: number;
    breakPreference: "paragraph" | "newline" | "sentence";
    flushOnParagraph?: boolean;
  };
  resolvedBlockStreamingBreak: "text_end" | "message_end";
  modelState: Awaited<ReturnType<typeof createModelSelectionState>>;
  provider: string;
  model: string;
  perMessageQueueMode?: InlineDirectives["queueMode"];
  perMessageQueueOptions?: {
    debounceMs?: number;
    cap?: number;
    dropPolicy?: InlineDirectives["dropPolicy"];
  };
  typing: TypingController;
  opts?: GetReplyOptions;
  defaultProvider: string;
  defaultModel: string;
  timeoutMs: number;
  isNewSession: boolean;
  resetTriggered: boolean;
  systemSent: boolean;
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey: string;
  sessionId?: string;
  storePath?: string;
  workspaceDir: string;
  abortedLastRun: boolean;
};

export async function runPreparedReply(
  params: RunPreparedReplyParams,
): Promise<ReplyPayload | ReplyPayload[] | undefined> {
  const {
    ctx,
    sessionCtx,
    cfg,
    agentId,
    agentDir,
    agentCfg,
    sessionCfg,
    commandAuthorized,
    command,
    commandSource,
    allowTextCommands,
    directives,
    defaultActivation,
    elevatedEnabled,
    elevatedAllowed,
    blockStreamingEnabled,
    blockReplyChunking,
    resolvedBlockStreamingBreak,
    modelState,
    provider,
    model,
    perMessageQueueMode,
    perMessageQueueOptions,
    typing,
    opts,
    defaultProvider,
    defaultModel,
    timeoutMs,
    isNewSession,
    resetTriggered,
    systemSent,
    sessionKey,
    sessionId,
    storePath,
    workspaceDir,
    sessionStore,
  } = params;
  let {
    sessionEntry,
    resolvedThinkLevel,
    resolvedVerboseLevel,
    resolvedReasoningLevel,
    resolvedElevatedLevel,
    execOverrides,
    abortedLastRun,
  } = params;
  let currentSystemSent = systemSent;

  const isFirstTurnInSession = isNewSession || !currentSystemSent;
  const isGroupChat = sessionCtx.ChatType === "group";
  const wasMentioned = ctx.WasMentioned === true;
  const isHeartbeat = opts?.isHeartbeat === true;
  const { typingPolicy, suppressTyping } = resolveRunTypingPolicy({
    requestedPolicy: opts?.typingPolicy,
    suppressTyping: opts?.suppressTyping === true,
    isHeartbeat,
    originatingChannel: ctx.OriginatingChannel,
  });
  const typingMode = resolveTypingMode({
    configured: sessionCfg?.typingMode ?? agentCfg?.typingMode,
    isGroupChat,
    wasMentioned,
    isHeartbeat,
    typingPolicy,
    suppressTyping,
  });
  const shouldInjectGroupIntro = Boolean(
    isGroupChat && (isFirstTurnInSession || sessionEntry?.groupActivationNeedsSystemIntro),
  );
  // Always include persistent group chat context (name, participants, reply guidance)
  const groupChatContext = isGroupChat ? buildGroupChatContext({ sessionCtx }) : "";
  // Behavioral intro (activation mode, lurking, etc.) only on first turn / activation needed
  const groupIntro = shouldInjectGroupIntro
    ? buildGroupIntro({
        cfg,
        sessionCtx,
        sessionEntry,
        defaultActivation,
        silentToken: SILENT_REPLY_TOKEN,
      })
    : "";
  const groupSystemPrompt = sessionCtx.GroupSystemPrompt?.trim() ?? "";
  const inboundMetaPrompt = buildInboundMetaSystemPrompt(
    isNewSession ? sessionCtx : { ...sessionCtx, ThreadStarterBody: undefined },
  );
  const extraSystemPromptParts = [
    inboundMetaPrompt,
    groupChatContext,
    groupIntro,
    groupSystemPrompt,
  ].filter(Boolean);
  const baseBody = sessionCtx.BodyStripped ?? sessionCtx.Body ?? "";
  // Use CommandBody/RawBody for bare reset detection (clean message without structural context).
  const rawBodyTrimmed = (ctx.CommandBody ?? ctx.RawBody ?? ctx.Body ?? "").trim();
  const baseBodyTrimmedRaw = baseBody.trim();
  if (
    allowTextCommands &&
    (!commandAuthorized || !command.isAuthorizedSender) &&
    !baseBodyTrimmedRaw &&
    hasControlCommand(commandSource, cfg)
  ) {
    typing.cleanup();
    return undefined;
  }
  const isBareNewOrReset = rawBodyTrimmed === "/new" || rawBodyTrimmed === "/reset";
  const isBareSessionReset =
    isNewSession &&
    ((baseBodyTrimmedRaw.length === 0 && rawBodyTrimmed.length > 0) || isBareNewOrReset);
  const baseBodyFinal = isBareSessionReset ? buildBareSessionResetPrompt(cfg) : baseBody;
  const inboundUserContext = buildInboundUserContextPrefix(
    isNewSession
      ? {
          ...sessionCtx,
          ...(sessionCtx.ThreadHistoryBody?.trim()
            ? { InboundHistory: undefined, ThreadStarterBody: undefined }
            : {}),
        }
      : { ...sessionCtx, ThreadStarterBody: undefined },
  );
  const baseBodyForPrompt = isBareSessionReset
    ? baseBodyFinal
    : [inboundUserContext, baseBodyFinal].filter(Boolean).join("\n\n");
  const baseBodyTrimmed = baseBodyForPrompt.trim();
  const hasMediaAttachment = Boolean(
    sessionCtx.MediaPath || (sessionCtx.MediaPaths && sessionCtx.MediaPaths.length > 0),
  );
  if (!baseBodyTrimmed && !hasMediaAttachment) {
    await typing.onReplyStart();
    logVerbose("Inbound body empty after normalization; skipping agent run");
    typing.cleanup();
    return {
      text: "I didn't receive any text in your message. Please resend or add a caption.",
    };
  }
  // When the user sends media without text, provide a minimal body so the agent
  // run proceeds and the image/document is injected by the embedded runner.
  const effectiveBaseBody = baseBodyTrimmed
    ? baseBodyForPrompt
    : "[User sent media without caption]";
  let prefixedBodyBase = await applySessionHints({
    baseBody: effectiveBaseBody,
    abortedLastRun,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    abortKey: command.abortKey,
  });
  const isGroupSession = sessionEntry?.chatType === "group" || sessionEntry?.chatType === "channel";
  const isMainSession = !isGroupSession && sessionKey === normalizeMainKey(sessionCfg?.mainKey);
  const queuedSystemPrompt = await buildQueuedSystemPrompt({
    cfg,
    sessionKey,
    isMainSession,
    isNewSession,
  });
  if (queuedSystemPrompt) {
    extraSystemPromptParts.push(queuedSystemPrompt);
  }
  prefixedBodyBase = appendUntrustedContext(prefixedBodyBase, sessionCtx.UntrustedContext);
  const threadStarterBody = ctx.ThreadStarterBody?.trim();
  const threadHistoryBody = ctx.ThreadHistoryBody?.trim();
  const threadContextNote = threadHistoryBody
    ? `[Thread history - for context]\n${threadHistoryBody}`
    : threadStarterBody
      ? `[Thread starter - for context]\n${threadStarterBody}`
      : undefined;
  const skillResult = await ensureSkillSnapshot({
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionId,
    isFirstTurnInSession,
    workspaceDir,
    cfg,
    skillFilter: opts?.skillFilter,
  });
  sessionEntry = skillResult.sessionEntry ?? sessionEntry;
  currentSystemSent = skillResult.systemSent;
  const skillsSnapshot = skillResult.skillsSnapshot;
  const prefixedBody = [threadContextNote, prefixedBodyBase].filter(Boolean).join("\n\n");
  const mediaNote = buildInboundMediaNote(ctx);
  const mediaReplyHint = mediaNote
    ? "To send an image back, prefer the message tool (media/path/filePath). If you must inline, use MEDIA:https://example.com/image.jpg (spaces ok, quote if needed) or a safe relative path like MEDIA:./image.jpg. Avoid absolute paths (MEDIA:/...) and ~ paths — they are blocked for security. Keep caption in the text body."
    : undefined;
  let prefixedCommandBody = mediaNote
    ? [mediaNote, mediaReplyHint, prefixedBody ?? ""].filter(Boolean).join("\n").trim()
    : prefixedBody;
  if (!resolvedThinkLevel && prefixedCommandBody) {
    const parts = prefixedCommandBody.split(/\s+/);
    const maybeLevel = normalizeThinkLevel(parts[0]);
    if (maybeLevel && (maybeLevel !== "xhigh" || supportsXHighThinking(provider, model))) {
      resolvedThinkLevel = maybeLevel;
      prefixedCommandBody = parts.slice(1).join(" ").trim();
    }
  }
  if (!resolvedThinkLevel) {
    resolvedThinkLevel = await modelState.resolveDefaultThinkingLevel();
  }
  if (resolvedThinkLevel === "xhigh" && !supportsXHighThinking(provider, model)) {
    const explicitThink = directives.hasThinkDirective && directives.thinkLevel !== undefined;
    if (explicitThink) {
      typing.cleanup();
      return {
        text: `Thinking level "xhigh" is only supported for ${formatXHighModelHint()}. Use /think high or switch to one of those models.`,
      };
    }
    resolvedThinkLevel = "high";
    if (sessionEntry && sessionStore && sessionKey && sessionEntry.thinkingLevel === "xhigh") {
      sessionEntry.thinkingLevel = "high";
      sessionEntry.updatedAt = Date.now();
      sessionStore[sessionKey] = sessionEntry;
      if (storePath) {
        await updateSessionStore(storePath, (store) => {
          store[sessionKey] = sessionEntry;
        });
      }
    }
  }
  if (resetTriggered && command.isAuthorizedSender) {
    await sendResetSessionNotice({
      ctx,
      command,
      sessionKey,
      cfg,
      accountId: ctx.AccountId,
      threadId: ctx.MessageThreadId,
      provider,
      model,
      defaultProvider,
      defaultModel,
    });
  }
  const sessionIdFinal = sessionId ?? crypto.randomUUID();
  const sessionFile = resolveSessionFilePath(
    sessionIdFinal,
    sessionEntry,
    resolveSessionFilePathOptions({ agentId, storePath }),
  );
  const queueBodyBase = [threadContextNote, effectiveBaseBody].filter(Boolean).join("\n\n");
  const queuedBody = mediaNote
    ? [mediaNote, mediaReplyHint, queueBodyBase].filter(Boolean).join("\n").trim()
    : queueBodyBase;
  const resolvedQueue = resolveQueueSettings({
    cfg,
    channel: sessionCtx.Provider,
    sessionEntry,
    inlineMode: perMessageQueueMode,
    inlineOptions: perMessageQueueOptions,
  });
  const sessionLaneKey = resolveEmbeddedSessionLane(sessionKey ?? sessionIdFinal);
  const laneSize = getQueueSize(sessionLaneKey);
  if (resolvedQueue.mode === "interrupt" && laneSize > 0) {
    const cleared = clearCommandLane(sessionLaneKey);
    const aborted = abortEmbeddedPiRun(sessionIdFinal);
    logVerbose(`Interrupting ${sessionLaneKey} (cleared ${cleared}, aborted=${aborted})`);
  }
  const queueKey = sessionKey ?? sessionIdFinal;
  const isActive = isEmbeddedPiRunActive(sessionIdFinal);
  const isStreaming = isEmbeddedPiRunStreaming(sessionIdFinal);
  const shouldSteer = resolvedQueue.mode === "steer" || resolvedQueue.mode === "steer-backlog";
  const shouldFollowup =
    resolvedQueue.mode === "followup" ||
    resolvedQueue.mode === "collect" ||
    resolvedQueue.mode === "steer-backlog";
  const authProfileId = await resolveSessionAuthProfileOverride({
    cfg,
    provider,
    agentDir,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    isNewSession,
  });
  const authProfileIdSource = sessionEntry?.authProfileOverrideSource;

  // Memory Orchestrator: inject 3-layer memory context (identity + patterns + episodic)
  const memoryOrchestrator = getGlobalMemoryOrchestrator();
  if (memoryOrchestrator?.isEnabled()) {
    try {
      const memoryContextBlock = await memoryOrchestrator.onSessionStart(sessionIdFinal);
      if (memoryContextBlock) {
        extraSystemPromptParts.push(memoryContextBlock);
      }
    } catch {
      // Memory errors must never break a session (graceful degradation)
    }
  }

  // Donna capabilities — injected so the LLM knows what tools/integrations are active.
  // Gmail/Calendar lines are conditional on OAuth tokens existing to avoid misleading the LLM.
  {
    const capLines = [
      "[Capacidades ativas da Donna]",
      "Voce TEM acesso a estas integracoes — use-as quando relevante, nunca diga que nao tem acesso:",
    ];
    const gmailTokens = await loadTokens();
    if (gmailTokens) {
      capLines.push(
        "- Gmail: le, classifica e alerta sobre emails (OAuth autorizado, gmail-watch ativo)",
      );
      capLines.push(
        "- Google Calendar: agenda e compromissos do dia (calendar.readonly autorizado)",
      );
    }
    capLines.push(
      "- Morning Brief: resumo diario enviado as 7h com email, agenda, tarefas, soul e foco do dia",
      "- SOUL Engine: analisa humor, energia, estresse e perfil psicometrico do usuario em cada mensagem",
      "- Shadow Army: 8 agentes especializados (Igris, Tusk, Jima, Iron, Tank, Bellion, Kaisel, Beru)",
      "- Stripe: monitoramento de pagamentos e receita (se configurado)",
      "- Notion: gestao de tasks e notas (se configurado)",
      "- WhatsApp: envio proativo de mensagens (se configurado)",
      "Quando o usuario perguntar sobre email, calendario ou qualquer capacidade acima, use diretamente.",
    );
    extraSystemPromptParts.push(capLines.join("\n"));
  }

  // Evolution Engine: track interaction + inject level context
  try {
    const evoTracker = EvolutionTracker.getGlobal();
    await evoTracker.load();
    evoTracker.recordInteraction();
    const evoState = evoTracker.getState();
    const progression = evaluateProgression(evoState.level, evoState.stats);
    let leveledUp = false;
    if (progression.shouldLevelUp) {
      evoTracker.setLevel(progression.nextLevel, progression.currentLevel);
      leveledUp = true;
    }
    if (evoTracker.shouldAutoSave()) {
      await evoTracker.save();
    } else {
      await evoTracker.save();
    }
    const levelDef = getLevelDefinition(evoTracker.getLevel());
    const stats = evoTracker.getState().stats;
    const nextDef =
      levelDef.level < 8
        ? getLevelDefinition(
            (levelDef.level + 1) as import("../../evolution/level.js").EvolutionLevel,
          )
        : null;
    const xpProgress = nextDef ? `${stats.xp}/${nextDef.xpRequired} XP` : "MAX";
    extraSystemPromptParts.push(
      `[Evolution] Rank ${levelDef.rank}: ${levelDef.title} | XP: ${xpProgress} | Streak: ${stats.streakDays}d | Skills: ${levelDef.unlocks.join(", ")}.`,
    );
    if (leveledUp) {
      extraSystemPromptParts.push(
        `[LEVEL UP!] Donna acabou de subir para Rank ${levelDef.rank} — ${levelDef.title}! Celebre brevemente no inicio da resposta com emojis e o novo rank antes de responder normalmente. Mencione as novas skills desbloqueadas: ${levelDef.unlocks.join(", ")}.`,
      );
      // Shadow Army: unlock shadows that match the new rank
      try {
        const shadowUnlocks = await checkShadowUnlocks(levelDef.rank);
        if (shadowUnlocks.unlocked.length > 0) {
          const unlockMsg = formatShadowUnlockMessage(shadowUnlocks);
          if (unlockMsg) {
            extraSystemPromptParts.push(
              `[ARISE! Shadow Army] ${shadowUnlocks.unlocked.map((s) => `${s.name} (${s.role})`).join(", ")} se juntaram ao exercito. Mencione as novas sombras extraidas na celebracao.`,
            );
          }
        }
      } catch {
        // Shadow unlock errors must never break a session
      }
    }
    // Shadow Army: orchestrate intent → dispatch to real shadow session via Pi runner
    // Skip shadow dispatch for soul intents — handled separately below
    try {
      const currentRank = getRankForLevel(evoTracker.getLevel());
      const shadowResult = await orchestrate(queuedBody ?? "", currentRank);
      if (shadowResult.delegated && shadowResult.shadow && !isSoulIntent(shadowResult.intent)) {
        // Attempt real delegation via Pi embedded runner
        try {
          const shadowDeps: DispatchDeps = {
            runEmbeddedPiAgent: async (p) => {
              const result = await runEmbeddedPiAgent({
                sessionId: p.sessionId,
                sessionKey: p.sessionKey,
                spawnedBy: p.spawnedBy,
                prompt: p.prompt,
                extraSystemPrompt: p.extraSystemPrompt,
                sessionFile: p.sessionFile,
                workspaceDir: p.workspaceDir,
                provider: p.provider,
                model: p.model,
                authProfileId: p.authProfileId,
                timeoutMs: p.timeoutMs,
                runId: p.runId,
                abortSignal: p.abortSignal,
                messageChannel: p.messageChannel,
                messageProvider: p.messageProvider,
                messageTo: p.messageTo,
              });
              return {
                payloads: result.payloads,
                meta: {
                  durationMs: result.meta?.durationMs ?? 0,
                  agentMeta: result.meta?.agentMeta,
                },
              };
            },
          };
          const shadowResponse = await dispatchShadow(
            queuedBody ?? "",
            shadowResult.shadow,
            {
              sessionId: sessionIdFinal,
              chatType: sessionCtx.ChatType,
              providerOverride: provider,
              modelOverride: model,
              authProfileOverride: authProfileId,
              sessionFile,
              channel: sessionCtx.Provider,
            },
            shadowDeps,
            {
              workspaceDir,
              messageChannel: ctx.OriginatingChannel ?? sessionCtx.Provider,
              messageProvider: ctx.Provider ?? sessionCtx.Provider,
              messageTo: ctx.OriginatingTo,
            },
          );
          if (shadowResponse.response) {
            // Route shadow response back to the originating channel and early-return
            // so the parent runner doesn't produce a duplicate reply.
            const originChannel = ctx.OriginatingChannel ?? sessionCtx.Provider;
            const originTo = ctx.OriginatingTo ?? sessionCtx.To;
            if (originChannel && originTo) {
              await routeReply({
                payload: { text: shadowResponse.response },
                channel: originChannel,
                to: originTo,
                sessionKey,
                accountId: sessionCtx.AccountId,
                threadId: ctx.MessageThreadId,
                cfg,
              });
              return { text: SILENT_REPLY_TOKEN };
            }
          }
        } catch {
          // Shadow dispatch failed — fall through to hint injection
        }
        // Fallback: inject hint if dispatch didn't produce a routed response
        extraSystemPromptParts.push(
          `[Shadow Army] A sombra ${shadowResult.shadow.name} (${shadowResult.shadow.role}) esta disponivel para esta tarefa. ` +
            `Ferramentas: ${shadowResult.shadow.tools.join(", ")}. ` +
            `Mencione que ${shadowResult.shadow.name} pode ajudar se relevante.`,
        );
      }
    } catch {
      // Shadow orchestration errors must never break a session
    }
    // If user asks for /status, inject full evolution card
    if (queuedBody && /^\/?status\b/i.test(queuedBody.trim())) {
      const bar = (cur: number, req: number) => {
        if (req <= 0) {
          return "MAX";
        }
        const pct = Math.min(cur / req, 1);
        const filled = Math.round(pct * 20);
        return "X".repeat(filled) + "-".repeat(20 - filled) + ` ${Math.round(pct * 100)}%`;
      };
      extraSystemPromptParts.push(
        [
          `[Status Card — include this formatted info in your reply]`,
          `Rank ${levelDef.rank} — ${levelDef.title}`,
          `"${levelDef.description}"`,
          `XP: ${stats.xp} ${nextDef ? `| Next: Rank ${nextDef.rank} at ${nextDef.xpRequired} XP` : "| RANK MAXIMO"}`,
          nextDef ? bar(stats.xp, nextDef.xpRequired) : "XXXXXXXXXXXXXXXXXXXX 100%",
          `Mensagens: ${stats.totalInteractions} | Tarefas: ${stats.tasksCompleted} | Erros: ${stats.errorsResolved}`,
          `Dias ativos: ${stats.daysActive} | Streak: ${stats.streakDays}d (record: ${stats.longestStreak}d)`,
          `Skills: ${stats.skillsUsed.length} | Uptime: ${Math.round(stats.uptimeHours)}h`,
          `Skills ativas: ${levelDef.unlocks.join(", ")}`,
        ].join("\n"),
      );
      // Add Shadow Army status to /status card
      try {
        const armyStatus = await getShadowArmyStatus();
        extraSystemPromptParts.push(`[Shadow Army Status]\n${armyStatus}`);
      } catch {
        // Non-fatal
      }
    }
  } catch {
    // Evolution errors must never break a session
  }

  // Gmail on-demand: fetch real emails when user asks about email/gmail
  if (queuedBody) {
    const emailIntent =
      /\b(email|e-mail|gmail|inbox|caixa de entrada|meus? emails?|correio|correo|mail\b)/i.test(
        queuedBody,
      );
    if (emailIntent) {
      try {
        const emails = await listRecentEmails(5);
        if (emails.length > 0) {
          const emailLines = emails.map(
            (e) => `• ${e.from.replace(/<.*>/, "").trim()} — ${e.subject} (${e.date})`,
          );
          extraSystemPromptParts.push(
            [
              "[Emails recentes — dados reais do Gmail do usuario]",
              ...emailLines,
              "",
              "Use estes dados para responder. Nunca diga que nao tem acesso ao email.",
            ].join("\n"),
          );
        } else {
          extraSystemPromptParts.push("[Gmail] Nenhum email nao lido na caixa de entrada.");
        }
      } catch (gmailErr) {
        // Gmail query failed — inject fallback so the LLM doesn't deny having access
        extraSystemPromptParts.push(
          [
            "[Gmail] Erro temporario ao consultar emails — OAuth pode precisar de refresh.",
            "Voce TEM acesso ao Gmail do usuario mas houve um erro tecnico nesta consulta.",
            "Diga ao usuario que houve um problema temporario ao consultar o Gmail e sugira tentar novamente em instantes.",
            "NUNCA diga que voce nao tem acesso ao email — voce tem, so houve uma falha temporaria.",
          ].join("\n"),
        );
        console.error("[gmail-on-demand] query failed:", (gmailErr as Error).message);
      }
    }
  }

  // SOUL Engine: handle soul commands directly, and enrich all messages with emotional context
  if (queuedBody) {
    try {
      const soulIntent = classifyIntent(queuedBody);
      if (isSoulIntent(soulIntent)) {
        // Soul command — handle directly; routeReply sends to channel,
        // return SILENT to prevent the bot handler from sending a duplicate.
        try {
          const soulResponse = await handleSoulCommand(queuedBody);
          const originChannel = ctx.OriginatingChannel ?? sessionCtx.Provider;
          const originTo = ctx.OriginatingTo ?? sessionCtx.To;
          if (originChannel && originTo && soulResponse) {
            await routeReply({
              payload: { text: soulResponse },
              channel: originChannel,
              to: originTo,
              sessionKey,
              accountId: sessionCtx.AccountId,
              threadId: ctx.MessageThreadId,
              cfg,
            });
            return { text: SILENT_REPLY_TOKEN };
          }
        } catch {
          // Soul command failed — fall through to normal reply
        }
      }

      // For all messages: process through soul engine to update profile + inject context
      const { context: soulCtx } = await processSoulMessage(queuedBody);
      const moodLabels: Record<string, string> = {
        focused: "focado",
        anxious: "ansioso",
        excited: "empolgado",
        frustrated: "frustrado",
        reflective: "reflexivo",
        rushed: "apressado",
        neutral: "neutro",
      };
      const energyLabels: Record<string, string> = {
        high: "alta",
        medium: "media",
        low: "baixa",
        depleted: "esgotada",
      };
      const soulHint = [
        `[Soul] Energia: ${energyLabels[soulCtx.energy] ?? soulCtx.energy} | Humor: ${moodLabels[soulCtx.mood] ?? soulCtx.mood} | Estresse: ${soulCtx.stressLevel}/10`,
        soulCtx.activePattern ? `Padrao: ${soulCtx.activePattern}` : null,
        soulCtx.relationshipAlert ? `Alerta: ${soulCtx.relationshipAlert}` : null,
        soulCtx.adaptationHint,
      ]
        .filter(Boolean)
        .join(" | ");
      extraSystemPromptParts.push(soulHint);
    } catch {
      // Soul engine errors must never break a session
    }
  }

  const followupRun = {
    prompt: queuedBody,
    messageId: sessionCtx.MessageSidFull ?? sessionCtx.MessageSid,
    summaryLine: baseBodyTrimmedRaw,
    enqueuedAt: Date.now(),
    // Originating channel for reply routing.
    originatingChannel: ctx.OriginatingChannel,
    originatingTo: ctx.OriginatingTo,
    originatingAccountId: ctx.AccountId,
    originatingThreadId: ctx.MessageThreadId,
    originatingChatType: ctx.ChatType,
    run: {
      agentId,
      agentDir,
      sessionId: sessionIdFinal,
      sessionKey,
      messageProvider: resolveOriginMessageProvider({
        originatingChannel: ctx.OriginatingChannel ?? sessionCtx.OriginatingChannel,
        // Prefer Provider over Surface for fallback channel identity.
        // Surface can carry relayed metadata (for example "webchat") while Provider
        // still reflects the active channel that should own tool routing.
        provider: ctx.Provider ?? ctx.Surface ?? sessionCtx.Provider,
      }),
      agentAccountId: sessionCtx.AccountId,
      groupId: resolveGroupSessionKey(sessionCtx)?.id ?? undefined,
      groupChannel: sessionCtx.GroupChannel?.trim() ?? sessionCtx.GroupSubject?.trim(),
      groupSpace: sessionCtx.GroupSpace?.trim() ?? undefined,
      senderId: sessionCtx.SenderId?.trim() || undefined,
      senderName: sessionCtx.SenderName?.trim() || undefined,
      senderUsername: sessionCtx.SenderUsername?.trim() || undefined,
      senderE164: sessionCtx.SenderE164?.trim() || undefined,
      senderIsOwner: command.senderIsOwner,
      sessionFile,
      workspaceDir,
      config: cfg,
      skillsSnapshot,
      provider,
      model,
      authProfileId,
      authProfileIdSource,
      thinkLevel: resolvedThinkLevel,
      verboseLevel: resolvedVerboseLevel,
      reasoningLevel: resolvedReasoningLevel,
      elevatedLevel: resolvedElevatedLevel,
      execOverrides,
      bashElevated: {
        enabled: elevatedEnabled,
        allowed: elevatedAllowed,
        defaultLevel: resolvedElevatedLevel ?? "off",
      },
      timeoutMs,
      blockReplyBreak: resolvedBlockStreamingBreak,
      ownerNumbers: command.ownerList.length > 0 ? command.ownerList : undefined,
      extraSystemPrompt: extraSystemPromptParts.join("\n\n") || undefined,
      ...(isReasoningTagProvider(provider) ? { enforceFinalTag: true } : {}),
    },
  };

  return runReplyAgent({
    commandBody: prefixedCommandBody,
    followupRun,
    queueKey,
    resolvedQueue,
    shouldSteer,
    shouldFollowup,
    isActive,
    isStreaming,
    opts,
    typing,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    defaultModel,
    agentCfgContextTokens: agentCfg?.contextTokens,
    resolvedVerboseLevel: resolvedVerboseLevel ?? "off",
    isNewSession,
    blockStreamingEnabled,
    blockReplyChunking,
    resolvedBlockStreamingBreak,
    sessionCtx,
    shouldInjectGroupIntro,
    typingMode,
  });
}

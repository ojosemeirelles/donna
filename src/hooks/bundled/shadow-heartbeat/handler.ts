/**
 * Shadow Heartbeat Hook — individual cron-like wake cycles for each shadow.
 *
 * On gateway startup, registers staggered timers (2 min apart) for each shadow.
 * Each timer reads the shadow's HEARTBEAT.md and dispatches it as a prompt,
 * so the shadow wakes, checks WORKING.md, and works or sleeps.
 *
 * Schedule (every 15 min, staggered by 2 min):
 *   Igris:   :00 :15 :30 :45
 *   Beru:    :02 :17 :32 :47
 *   Tusk:    :04 :19 :34 :49
 *   Iron:    :06 :21 :36 :51
 *   Bellion: :08 :23 :38 :53
 *   Kaisel:  :10 :25 :40 :55
 *   Jima:    :12 :27 :42 :57
 *   Tank:    :14 :29 :44 :59
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runEmbeddedPiAgent } from "../../../agents/pi-embedded.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import { dispatch, type DispatchDeps } from "../../../shadows/session-manager.js";
import type {
  ShadowDefinition,
  ShadowRegistry,
  HeartbeatResult,
  HeartbeatCycleReport,
} from "../../../shadows/types.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/shadow-heartbeat");

const FALLBACK_PROMPT =
  "SISTEMA: Ciclo de Heartbeat. Verifique seu WORKING.md. Se houver tarefas pendentes, execute o próximo passo. Se não, responda 'SLEEP'.";

/** Shadow schedule: name → cron minutes (every 15 min, staggered by 2 min) */
const SHADOW_SCHEDULES: Array<{ name: string; offsetMinutes: number }> = [
  { name: "Igris", offsetMinutes: 0 },
  { name: "Beru", offsetMinutes: 2 },
  { name: "Tusk", offsetMinutes: 4 },
  { name: "Iron", offsetMinutes: 6 },
  { name: "Bellion", offsetMinutes: 8 },
  { name: "Kaisel", offsetMinutes: 10 },
  { name: "Jima", offsetMinutes: 12 },
  { name: "Tank", offsetMinutes: 14 },
];

const CYCLE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/** Active timers so we can clean up on shutdown */
const activeTimers: NodeJS.Timeout[] = [];

// --- Helpers ---

async function loadRegistry(): Promise<ShadowRegistry | null> {
  try {
    const raw = await fs.readFile(
      path.join(os.homedir(), ".donna", "shadows", "registry.json"),
      "utf-8",
    );
    return JSON.parse(raw) as ShadowRegistry;
  } catch {
    return null;
  }
}

async function loadHeartbeatMd(shadowName: string): Promise<string> {
  try {
    const p = path.join(os.homedir(), ".donna", "shadows", shadowName, "HEARTBEAT.md");
    return await fs.readFile(p, "utf-8");
  } catch {
    return FALLBACK_PROMPT;
  }
}

async function appendToJimaLog(entry: HeartbeatResult): Promise<void> {
  const logDir = path.join(os.homedir(), ".donna", "shadows", "Jima");
  await fs.mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, "heartbeat.log.jsonl");
  await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf-8");
}

// --- Core ---

async function wakeOneShadow(
  shadow: ShadowDefinition,
  deps: DispatchDeps,
): Promise<HeartbeatResult> {
  const start = Date.now();
  const prompt = await loadHeartbeatMd(shadow.name);

  try {
    const result = await dispatch(
      prompt,
      shadow,
      {
        sessionId: `heartbeat:${shadow.name.toLowerCase()}:${randomUUID()}`,
        chatType: "system",
        channel: "heartbeat",
      },
      deps,
      { workspaceDir: path.join(os.homedir(), ".donna", "workspace") },
    );

    const isSleep = /\bSLEEP\b/i.test(result.response);
    return {
      shadowName: shadow.name,
      status: isSleep ? "sleep" : "awake",
      response: result.response.slice(0, 500),
      durationMs: Date.now() - start,
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      shadowName: shadow.name,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      timestamp: Date.now(),
    };
  }
}

/** Schedule a single shadow's heartbeat timer */
function scheduleShadow(shadowName: string, offsetMs: number, deps: DispatchDeps): void {
  // First fire: wait until the next matching minute slot
  const now = Date.now();
  const minuteInCycle = Date.now() % CYCLE_INTERVAL_MS;
  let firstFireMs = offsetMs * 60 * 1000 - minuteInCycle;
  if (firstFireMs < 0) {
    firstFireMs += CYCLE_INTERVAL_MS;
  }

  const firstTimer = setTimeout(async () => {
    await fireHeartbeat(shadowName, deps);

    // Then repeat every 15 min
    const interval = setInterval(() => {
      void fireHeartbeat(shadowName, deps);
    }, CYCLE_INTERVAL_MS);
    activeTimers.push(interval);
  }, firstFireMs);

  activeTimers.push(firstTimer);
  const nextFireDate = new Date(now + firstFireMs);
  log.info(
    `[heartbeat] ${shadowName} scheduled — offset :${String(offsetMs).padStart(2, "0")}, first fire ${nextFireDate.toLocaleTimeString()}`,
  );
}

async function fireHeartbeat(shadowName: string, deps: DispatchDeps): Promise<void> {
  const registry = await loadRegistry();
  if (!registry) {
    return;
  }

  const shadow = registry.shadows.find((s) => s.name === shadowName && s.status === "active");
  if (!shadow) {
    log.info(`[heartbeat] ${shadowName} skipped — not active`);
    return;
  }

  log.info(`[heartbeat] Waking ${shadowName}...`);
  const result = await wakeOneShadow(shadow, deps);

  if (result.status === "failed") {
    log.warn(`[heartbeat] ${shadowName} FAILED: ${result.error}`);
  } else if (result.status === "awake") {
    log.info(`[heartbeat] ${shadowName} AWAKE — working`);
  } else {
    log.info(`[heartbeat] ${shadowName} SLEEP`);
  }

  // Jima logs everything
  try {
    await appendToJimaLog(result);
  } catch {
    // non-fatal
  }
}

/** Run a full heartbeat cycle (all shadows at once). Exported for manual invocation. */
export async function runHeartbeatCycle(deps: DispatchDeps): Promise<HeartbeatCycleReport> {
  const cycleId = randomUUID();
  const startedAt = Date.now();
  const registry = await loadRegistry();

  if (!registry) {
    return {
      cycleId,
      startedAt,
      completedAt: Date.now(),
      results: [],
      awake: 0,
      sleeping: 0,
      failed: 0,
    };
  }

  const results: HeartbeatResult[] = [];
  for (const shadow of registry.shadows.filter((s) => s.status === "active")) {
    results.push(await wakeOneShadow(shadow, deps));
  }

  return {
    cycleId,
    startedAt,
    completedAt: Date.now(),
    results,
    awake: results.filter((r) => r.status === "awake").length,
    sleeping: results.filter((r) => r.status === "sleep").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}

/** Stop all heartbeat timers. */
export function stopAllHeartbeats(): void {
  for (const t of activeTimers) {
    clearTimeout(t);
  }
  activeTimers.length = 0;
  log.info("[heartbeat] All timers stopped");
}

// --- DispatchDeps wiring ---

/** Build real DispatchDeps using the Pi embedded runner (same as get-reply-run.ts). */
function buildDispatchDeps(): DispatchDeps {
  return {
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
}

// --- Hook Handler ---

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  const registry = await loadRegistry();
  if (!registry) {
    log.warn("[heartbeat] No shadow registry — heartbeat disabled");
    return;
  }

  const deps = buildDispatchDeps();

  log.info(
    `[heartbeat] Registering ${SHADOW_SCHEDULES.length} shadow heartbeat timers (15 min cycle, 2 min stagger)`,
  );

  for (const schedule of SHADOW_SCHEDULES) {
    const shadow = registry.shadows.find((s) => s.name === schedule.name && s.status === "active");
    if (!shadow) {
      log.info(`[heartbeat] ${schedule.name} skipped — not active in registry`);
      continue;
    }
    scheduleShadow(schedule.name, schedule.offsetMinutes, deps);
  }
};

export default handler;

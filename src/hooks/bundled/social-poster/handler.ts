import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/social-poster");

export const SOCIAL_POSTER_JOB_ID = "social-poster-check";

export type SocialPlatform = "instagram" | "linkedin" | "twitter";

export type ScheduledPost = {
  id: string;
  platform: SocialPlatform;
  content: string;
  scheduledAt: number;
  status: "pending" | "posted" | "failed";
  createdAt: number;
};

export type SocialPosterConfig = {
  enabled: boolean;
  telegramChatId: string;
  /** Check interval in minutes — default: 5 */
  checkIntervalMinutes: number;
};

export type SocialSchedule = {
  posts: ScheduledPost[];
};

function getDefaultSocialConfig(): SocialPosterConfig {
  return {
    enabled: true,
    telegramChatId: "6008067521",
    checkIntervalMinutes: 5,
  };
}

const DONNA_DIR = path.join(os.homedir(), ".donna");

export async function loadSocialConfig(): Promise<SocialPosterConfig> {
  const configPath = path.join(DONNA_DIR, "hooks", "social-poster", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultSocialConfig(), ...(JSON.parse(raw) as Partial<SocialPosterConfig>) };
  } catch {
    return getDefaultSocialConfig();
  }
}

const SCHEDULE_PATH = path.join(DONNA_DIR, "social-schedule.json");

export async function loadSchedule(): Promise<SocialSchedule> {
  try {
    const raw = await fs.readFile(SCHEDULE_PATH, "utf-8");
    return JSON.parse(raw) as SocialSchedule;
  } catch {
    return { posts: [] };
  }
}

export async function saveSchedule(schedule: SocialSchedule): Promise<void> {
  await fs.mkdir(path.dirname(SCHEDULE_PATH), { recursive: true });
  await fs.writeFile(SCHEDULE_PATH, JSON.stringify(schedule, null, 2), "utf-8");
}

export async function schedulePost(
  platform: SocialPlatform,
  content: string,
  scheduledAt: number,
): Promise<ScheduledPost> {
  const schedule = await loadSchedule();
  const now = Date.now();
  const post: ScheduledPost = {
    id: `post-${now}-${Math.random().toString(36).slice(2, 8)}`,
    platform,
    content,
    scheduledAt,
    status: "pending",
    createdAt: now,
  };
  schedule.posts.push(post);
  await saveSchedule(schedule);
  return post;
}

export function getPendingPosts(schedule: SocialSchedule): ScheduledPost[] {
  const now = Date.now();
  return schedule.posts.filter((p) => p.scheduledAt <= now && p.status === "pending");
}

export function formatScheduleList(posts: ScheduledPost[]): string {
  if (posts.length === 0) {
    return "No scheduled posts.";
  }
  const lines = posts.map((p) => {
    const date = new Date(p.scheduledAt).toLocaleString();
    return `- [${p.status}] ${p.platform}: "${p.content.slice(0, 60)}${p.content.length > 60 ? "..." : ""}" @ ${date}`;
  });
  return lines.join("\n");
}

/** Returns a summary of today's scheduled posts for the morning brief, or null if none. */
export function getMorningBriefSummary(schedule: SocialSchedule): string | null {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayPosts = schedule.posts.filter(
    (p) => p.scheduledAt >= todayStart.getTime() && p.scheduledAt <= todayEnd.getTime(),
  );

  if (todayPosts.length === 0) {
    return null;
  }

  return `${todayPosts.length} post(s) scheduled for today`;
}

function buildSocialPosterJob(config: SocialPosterConfig): CronJob {
  const intervalMs = (config.checkIntervalMinutes ?? 5) * 60 * 1000;
  const now = Date.now();
  const hasDelivery = Boolean(config.telegramChatId);

  return {
    id: SOCIAL_POSTER_JOB_ID,
    agentId: "main",
    name: "Social Poster Check",
    description: "Check for scheduled social media posts ready to publish",
    enabled: config.enabled,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        "Check ~/.donna/social-schedule.json for pending posts that are due. " +
        "For each pending post, attempt to publish it to the specified platform. " +
        "Update the post status to 'posted' or 'failed' accordingly. " +
        "Report the results.",
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
    const config = await loadSocialConfig();
    if (!config.enabled) {
      log.debug("social-poster hook disabled — skipping registration");
      return;
    }

    const job = buildSocialPosterJob(config);
    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    const exists = store.jobs.some((j) => j.id === SOCIAL_POSTER_JOB_ID);
    if (exists) {
      log.debug("social-poster cron job already registered — skipping");
      return;
    }

    store.jobs.push(job);
    await saveCronStore(storePath, store);

    const intervalMin = config.checkIntervalMinutes ?? 5;
    const chatNote = config.telegramChatId
      ? ` -> Telegram ${config.telegramChatId}`
      : " (no telegramChatId configured)";

    log.info(
      `social-poster registered: every ${intervalMin}min${chatNote}. Restart the gateway to activate.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register social-poster cron job: ${message}`);
  }
};

export default handler;

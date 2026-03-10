import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCronStore, resolveCronStorePath, saveCronStore } from "../../../cron/store.js";
import type { CronJob } from "../../../cron/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { HookHandler } from "../../hooks.js";
import { isGatewayStartupEvent } from "../../internal-hooks.js";

const log = createSubsystemLogger("hooks/github-monitor");

export const GITHUB_MONITOR_CHECK_JOB_ID = "github-monitor-check";
export const GITHUB_MONITOR_WEEKLY_JOB_ID = "github-monitor-weekly";

export interface GitHubMonitorConfig {
  enabled: boolean;
  telegramChatId: string;
  repos: string[];
  checkIntervalMinutes: number;
  weeklyReportDay: string;
  alertOnCIFailure: boolean;
}

export interface GitHubToken {
  token: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  author: string;
  url: string;
  state: string;
  createdAt: string;
  isDraft: boolean;
}

export interface GitHubIssue {
  number: number;
  title: string;
  labels: string[];
  url: string;
  state: string;
  createdAt: string;
}

export interface CIStatus {
  repo: string;
  branch: string;
  status: "success" | "failure" | "pending";
  conclusion: string;
  url: string;
}

export function getDefaultGitHubConfig(): GitHubMonitorConfig {
  return {
    enabled: true,
    telegramChatId: "6008067521",
    repos: [],
    checkIntervalMinutes: 30,
    weeklyReportDay: "MON",
    alertOnCIFailure: true,
  };
}

export async function loadGitHubConfig(): Promise<GitHubMonitorConfig> {
  const configPath = path.join(os.homedir(), ".donna", "hooks", "github-monitor", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...getDefaultGitHubConfig(), ...(JSON.parse(raw) as Partial<GitHubMonitorConfig>) };
  } catch {
    return getDefaultGitHubConfig();
  }
}

export async function loadGitHubToken(): Promise<GitHubToken | null> {
  const tokenPath = path.join(os.homedir(), ".donna", "github-token.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    const parsed = JSON.parse(raw) as GitHubToken;
    if (!parsed.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchOpenPRs(token: string, repo: string): Promise<GitHubPR[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=open&per_page=20`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub PRs fetch failed for ${repo}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((pr) => ({
    number: pr.number as number,
    title: pr.title as string,
    author: ((pr.user as Record<string, unknown>)?.login as string) ?? "unknown",
    url: pr.html_url as string,
    state: pr.state as string,
    createdAt: pr.created_at as string,
    isDraft: (pr.draft as boolean) ?? false,
  }));
}

export async function fetchRecentIssues(
  token: string,
  repo: string,
  since: string,
): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${repo}/issues?state=open&since=${since}&per_page=20`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub issues fetch failed for ${repo}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  // Filter out pull requests (GitHub API returns PRs in issues endpoint)
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number as number,
      title: issue.title as string,
      labels: ((issue.labels as Array<Record<string, unknown>>) ?? []).map(
        (l) => (l.name as string) ?? "",
      ),
      url: issue.html_url as string,
      state: issue.state as string,
      createdAt: issue.created_at as string,
    }));
}

export async function fetchCIStatus(
  token: string,
  repo: string,
  branch: string,
): Promise<CIStatus> {
  const url = `https://api.github.com/repos/${repo}/commits/${branch}/check-runs`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub CI status fetch failed for ${repo}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    check_runs?: Array<Record<string, unknown>>;
  };
  const runs = data.check_runs ?? [];

  let overallStatus: "success" | "failure" | "pending" = "success";
  let conclusion = "success";
  let checkUrl = `https://github.com/${repo}`;

  for (const run of runs) {
    const runConclusion = run.conclusion as string | null;
    const runStatus = run.status as string;

    if (runStatus !== "completed") {
      overallStatus = "pending";
      conclusion = "in_progress";
    } else if (runConclusion === "failure") {
      overallStatus = "failure";
      conclusion = "failure";
      checkUrl = (run.html_url as string) ?? checkUrl;
    }
  }

  return { repo, branch, status: overallStatus, conclusion, url: checkUrl };
}

export function formatRepoStatus(
  repo: string,
  prs: GitHubPR[],
  issues: GitHubIssue[],
  ci: CIStatus,
): string {
  const lines: string[] = [`*${repo}*`];

  const ciEmoji = ci.status === "success" ? "+" : ci.status === "failure" ? "x" : "~";
  lines.push(`CI: [${ciEmoji}] ${ci.status} (${ci.conclusion})`);

  if (prs.length > 0) {
    lines.push(`\nOpen PRs (${prs.length}):`);
    for (const pr of prs.slice(0, 5)) {
      const draftTag = pr.isDraft ? " [draft]" : "";
      lines.push(`  - #${pr.number} ${pr.title} by ${pr.author}${draftTag}`);
    }
    if (prs.length > 5) {
      lines.push(`  ... and ${prs.length - 5} more`);
    }
  }

  if (issues.length > 0) {
    lines.push(`\nRecent Issues (${issues.length}):`);
    for (const issue of issues.slice(0, 5)) {
      const labelStr = issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
      lines.push(`  - #${issue.number} ${issue.title}${labelStr}`);
    }
    if (issues.length > 5) {
      lines.push(`  ... and ${issues.length - 5} more`);
    }
  }

  return lines.join("\n");
}

export function formatCIFailureAlert(ci: CIStatus): string {
  return [
    "*CI Failure Alert*",
    `Repo: ${ci.repo}`,
    `Branch: ${ci.branch}`,
    `Status: ${ci.conclusion}`,
    `Details: ${ci.url}`,
  ].join("\n");
}

export function formatWeeklyReport(
  allRepos: Array<{ repo: string; prs: GitHubPR[]; issues: GitHubIssue[] }>,
): string {
  const lines: string[] = ["*Weekly GitHub Report*\n"];

  for (const { repo, prs, issues } of allRepos) {
    lines.push(`*${repo}*`);
    lines.push(`  Open PRs: ${prs.length}`);
    lines.push(`  Open Issues: ${issues.length}`);

    const recentPRs = prs.slice(0, 3);
    if (recentPRs.length > 0) {
      lines.push("  Latest PRs:");
      for (const pr of recentPRs) {
        lines.push(`    - #${pr.number} ${pr.title}`);
      }
    }
    lines.push("");
  }

  const totalPRs = allRepos.reduce((sum, r) => sum + r.prs.length, 0);
  const totalIssues = allRepos.reduce((sum, r) => sum + r.issues.length, 0);
  lines.push(
    `*Total: ${totalPRs} open PRs, ${totalIssues} open issues across ${allRepos.length} repos*`,
  );

  return lines.join("\n");
}

export async function getMorningBriefSummary(): Promise<string | null> {
  try {
    const config = await loadGitHubConfig();
    if (!config.enabled || config.repos.length === 0) {
      return null;
    }
    const tokenData = await loadGitHubToken();
    if (!tokenData) {
      return null;
    }

    let totalPRs = 0;
    let totalIssues = 0;

    for (const repo of config.repos) {
      try {
        const prs = await fetchOpenPRs(tokenData.token, repo);
        totalPRs += prs.length;

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const issues = await fetchRecentIssues(tokenData.token, repo, since);
        totalIssues += issues.length;
      } catch (err) {
        log.warn(`Failed to fetch ${repo}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (totalPRs === 0 && totalIssues === 0) {
      return null;
    }

    return `GitHub: ${totalPRs} open PRs, ${totalIssues} open issues across ${config.repos.length} repos`;
  } catch (err) {
    log.warn(
      `Morning brief GitHub summary failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function buildGitHubCheckJob(config: GitHubMonitorConfig): CronJob {
  const intervalMs = config.checkIntervalMinutes * 60 * 1000;
  const now = Date.now();

  return {
    id: GITHUB_MONITOR_CHECK_JOB_ID,
    agentId: "main",
    name: "GitHub Monitor Check",
    description: "Periodically check GitHub repos for PRs, issues, and CI status",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: intervalMs },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        "Check configured GitHub repos for open PRs, recent issues, and CI status. Send alerts for CI failures.",
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

/** Map day abbreviation to cron day-of-week number (0=SUN). */
function dayToCron(day: string): string {
  const map: Record<string, string> = {
    SUN: "0",
    MON: "1",
    TUE: "2",
    WED: "3",
    THU: "4",
    FRI: "5",
    SAT: "6",
  };
  return map[day.toUpperCase()] ?? "1";
}

function buildGitHubWeeklyJob(config: GitHubMonitorConfig): CronJob {
  const now = Date.now();
  const cronDay = dayToCron(config.weeklyReportDay);

  return {
    id: GITHUB_MONITOR_WEEKLY_JOB_ID,
    agentId: "main",
    name: "GitHub Weekly Report",
    description: "Weekly summary of GitHub activity across all monitored repos",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: {
      kind: "cron",
      expr: `0 9 * * ${cronDay}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        "Generate the weekly GitHub report with PR and issue counts for all monitored repos.",
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

const handler: HookHandler = async (event) => {
  if (!isGatewayStartupEvent(event)) {
    return;
  }

  try {
    const config = await loadGitHubConfig();
    if (!config.enabled) {
      log.debug("github-monitor is disabled — skipping registration");
      return;
    }

    const storePath = resolveCronStorePath();
    const store = await loadCronStore(storePath);

    let registered = false;

    if (!store.jobs.some((j) => j.id === GITHUB_MONITOR_CHECK_JOB_ID)) {
      store.jobs.push(buildGitHubCheckJob(config));
      registered = true;
      log.info(
        `github-monitor-check registered: every ${config.checkIntervalMinutes}m → Telegram ${config.telegramChatId}`,
      );
    } else {
      log.debug("github-monitor-check cron job already registered — skipping");
    }

    if (!store.jobs.some((j) => j.id === GITHUB_MONITOR_WEEKLY_JOB_ID)) {
      store.jobs.push(buildGitHubWeeklyJob(config));
      registered = true;
      log.info(
        `github-monitor-weekly registered: ${config.weeklyReportDay} 9:00 → Telegram ${config.telegramChatId}`,
      );
    } else {
      log.debug("github-monitor-weekly cron job already registered — skipping");
    }

    if (registered) {
      await saveCronStore(storePath, store);
      log.info("github-monitor cron jobs saved. Restart the gateway to activate.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`failed to register github-monitor cron jobs: ${message}`);
  }
};

export default handler;

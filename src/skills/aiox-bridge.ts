/**
 * AIOX Bridge — connects the local .aiox-core framework with the Shadow Army.
 *
 * Reads stories/epics from docs/stories/ and PRD, converts tasks into
 * shadow_tasks rows so Mission Control dashboard shows planning progress.
 * Also provides `aioxPlan` and `aioxDoctor` helpers for shadow system prompts.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTask, getPendingTasks } from "../shadows/mission-control.js";

// --- Types ---

export type AIOXEpic = {
  id: string;
  title: string;
  status: "backlog" | "in_progress" | "done";
  stories: AIOXStory[];
};

export type AIOXStory = {
  id: string;
  title: string;
  status: string;
  tasks: Array<{ title: string; status: string }>;
};

export type AIOXProjectStatus = {
  currentEpic: string | null;
  totalStories: number;
  completedStories: number;
  pendingTasks: number;
  confidenceScore: number;
  errorRate: number;
};

// --- Context ---

const PROJECT_ROOT = path.join(os.homedir(), "donna");
const STORIES_DIR = path.join(PROJECT_ROOT, "docs", "stories");
const PRD_PATH = path.join(PROJECT_ROOT, "scripts", "ralph", "prd.json");

// --- Core Functions ---

/** Load all epics/stories from prd.json */
export async function loadEpics(): Promise<AIOXEpic[]> {
  try {
    const raw = await fs.readFile(PRD_PATH, "utf-8");
    const prd = JSON.parse(raw) as {
      stories: Array<{
        id: string;
        title: string;
        status: string;
        tasks: Array<{ title: string; status: string }>;
      }>;
    };

    // Group by epic prefix (DONNA-00X)
    const epicMap = new Map<string, AIOXEpic>();
    for (const story of prd.stories) {
      const epicId = story.id;
      epicMap.set(epicId, {
        id: epicId,
        title: story.title,
        status:
          story.status === "done" ? "done" : story.status === "backlog" ? "backlog" : "in_progress",
        stories: [
          {
            id: story.id,
            title: story.title,
            status: story.status,
            tasks: story.tasks ?? [],
          },
        ],
      });
    }
    return Array.from(epicMap.values());
  } catch {
    return [];
  }
}

/** Scan docs/stories/ for .md files and extract status */
export async function loadStoryFiles(): Promise<AIOXStory[]> {
  try {
    const files = await fs.readdir(STORIES_DIR);
    const stories: AIOXStory[] = [];

    for (const file of files.filter((f) => f.endsWith(".md") && f.startsWith("story-"))) {
      const content = await fs.readFile(path.join(STORIES_DIR, file), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)/m);
      const statusMatch = content.match(/\*\*Status:\*\*\s*\[([x ])\]/);
      const isDone = statusMatch?.[1] === "x";

      // Count task checkboxes
      const taskLines = content.match(/^- \[[ x]\] .+/gm) ?? [];
      const completedTasks = taskLines.filter((l) => l.startsWith("- [x]")).length;

      stories.push({
        id: file.replace(".md", ""),
        title: titleMatch?.[1] ?? file,
        status: isDone ? "done" : "in_progress",
        tasks: taskLines.map((l) => ({
          title: l.replace(/^- \[[ x]\] /, ""),
          status: l.startsWith("- [x]") ? "done" : "pending",
        })),
      });
    }
    return stories;
  } catch {
    return [];
  }
}

/**
 * Sync AIOX epics/stories → shadow_tasks.
 * Only creates tasks for pending items that don't already exist.
 * Returns count of new tasks created.
 */
export async function syncEpicsToShadowTasks(): Promise<number> {
  const epics = await loadEpics();
  let created = 0;

  for (const epic of epics) {
    if (epic.status === "done") continue;

    for (const story of epic.stories) {
      if (story.status === "done") continue;

      for (const task of story.tasks) {
        if (task.status === "done" || task.status === "completed") continue;

        // Check if already exists in shadow_tasks (by description match)
        const existing = getPendingTasks("Igris");
        const desc = `[${story.id}] ${task.title}`;
        if (existing.some((t) => t.description === desc)) continue;

        // Create as Igris task (he delegates to the right shadow)
        createTask("Igris", desc, 0);
        created++;
      }
    }
  }

  return created;
}

/** Calculate project status metrics */
export async function getProjectStatus(): Promise<AIOXProjectStatus> {
  const epics = await loadEpics();
  const stories = await loadStoryFiles();

  const allStories = [...stories];
  const completed = allStories.filter((s) => s.status === "done").length;
  const total = allStories.length;

  // Find current epic (first non-done in PRD)
  const currentEpic = epics.find((e) => e.status !== "done");

  // Count all pending tasks across all stories
  const pendingTasks = allStories
    .flatMap((s) => s.tasks)
    .filter((t) => t.status !== "done" && t.status !== "completed").length;

  // Confidence: ratio of completed stories (0-100)
  const confidenceScore = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Error rate: placeholder based on known issues (could be enriched later)
  const errorRate = 0;

  return {
    currentEpic: currentEpic?.title ?? null,
    totalStories: total,
    completedStories: completed,
    pendingTasks,
    confidenceScore,
    errorRate,
  };
}

/**
 * aioxPlan — generates a simple execution plan for a task description.
 * Used by Igris to decompose complex requests into shadow assignments.
 */
export function aioxPlan(taskDescription: string): string {
  // Shadow assignment heuristics
  const assignments: Array<{ shadow: string; task: string; reason: string }> = [];

  const lower = taskDescription.toLowerCase();

  if (/pesquis|search|busca|investig/i.test(lower)) {
    assignments.push({
      shadow: "Tusk",
      task: "Research phase",
      reason: "web search + info gathering",
    });
  }
  if (/escrev|write|document|relatorio|report/i.test(lower)) {
    assignments.push({ shadow: "Iron", task: "Writing phase", reason: "content creation" });
  }
  if (/execut|rodar|deploy|build|script|bash|command/i.test(lower)) {
    assignments.push({ shadow: "Beru", task: "Execution phase", reason: "shell + OS automation" });
  }
  if (/analis|analyz|dados|data|metr/i.test(lower)) {
    assignments.push({ shadow: "Bellion", task: "Analysis phase", reason: "strategic analysis" });
  }
  if (/agend|schedul|cron|lembr|remind/i.test(lower)) {
    assignments.push({ shadow: "Tank", task: "Scheduling phase", reason: "time management" });
  }
  if (/browser|naveg|site|page|scrape/i.test(lower)) {
    assignments.push({ shadow: "Kaisel", task: "Browser phase", reason: "web automation" });
  }
  if (/monitor|watch|alert|log/i.test(lower)) {
    assignments.push({ shadow: "Jima", task: "Monitoring phase", reason: "silent observation" });
  }

  if (assignments.length === 0) {
    assignments.push({
      shadow: "Igris",
      task: "Direct execution",
      reason: "no specialized shadow match",
    });
  }

  const lines = [
    `## Execution Plan`,
    `Task: ${taskDescription}`,
    `Phases: ${assignments.length}`,
    "",
  ];
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i]!;
    lines.push(`${i + 1}. **${a.shadow}** — ${a.task} (${a.reason})`);
  }
  return lines.join("\n");
}

/**
 * aioxDoctor — analyzes an error log and suggests recovery strategy.
 * Used by Beru and Iron for self-healing.
 */
export function aioxDoctor(errorLog: string): string {
  const lower = errorLog.toLowerCase();
  const suggestions: string[] = [];

  if (/permission denied|eacces/i.test(lower)) {
    suggestions.push("Permission error: try with elevated privileges or check file ownership");
  }
  if (/enoent|no such file/i.test(lower)) {
    suggestions.push(
      "File not found: verify path exists, check for typos, ensure directory was created",
    );
  }
  if (/econnrefused|econnreset|etimedout/i.test(lower)) {
    suggestions.push(
      "Network error: check if service is running, verify port/host, retry with backoff",
    );
  }
  if (/syntax error|unexpected token/i.test(lower)) {
    suggestions.push(
      "Syntax error: review the generated code/command for typos or missing delimiters",
    );
  }
  if (/out of memory|heap|allocation/i.test(lower)) {
    suggestions.push(
      "Memory error: reduce batch size, add --max-old-space-size flag, or process in chunks",
    );
  }
  if (/timeout|timed out/i.test(lower)) {
    suggestions.push(
      "Timeout: increase timeout value, break into smaller operations, check for deadlocks",
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Unknown error pattern: log the full error, retry once, then escalate to Igris",
    );
  }

  return [
    "## Doctor Diagnosis",
    "",
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Strategy: Apply fix #1 first. If it fails, try #2. After 2 failed attempts, escalate to Igris with full error context.",
  ].join("\n");
}

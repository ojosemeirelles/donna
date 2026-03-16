/**
 * Mission Control API — serves shadow status, tasks, notifications, and heartbeat logs.
 * Route: GET /api/mission-control
 */

import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";

type AIOXMetadata = {
  currentEpic: string | null;
  totalStories: number;
  completedStories: number;
  pendingTasks: number;
  confidenceScore: number;
  errorRate: number;
};

type MissionControlResponse = {
  shadows: ShadowStatus[];
  tasks: TaskRow[];
  notifications: NotificationRow[];
  heartbeat: HeartbeatLogEntry[];
  evolution: EvolutionSnapshot | null;
  aiox: AIOXMetadata | null;
};

type ShadowStatus = {
  name: string;
  role: string;
  status: string;
  tools: string[];
  currentTask: string | null;
};

type TaskRow = {
  id: string;
  shadow_name: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  from_shadow: string;
  to_shadow: string;
  message: string;
  is_read: number;
  task_id: string | null;
  created_at: string;
};

type HeartbeatLogEntry = {
  cycleId: string;
  startedAt: number;
  completedAt: number;
  awake: number;
  sleeping: number;
  failed: number;
  results: Array<{ shadowName: string; status: string; durationMs: number }>;
};

type EvolutionSnapshot = {
  level: number;
  rank: string;
  title: string;
  xp: number;
  nextXp: number | null;
  streakDays: number;
  totalInteractions: number;
};

/** Load shadow registry */
async function loadShadowRegistry(): Promise<
  Array<{ name: string; role: string; status: string; tools: string[] }>
> {
  try {
    const raw = await fs.readFile(
      path.join(os.homedir(), ".donna", "shadows", "registry.json"),
      "utf-8",
    );
    const registry = JSON.parse(raw) as {
      shadows: Array<{ name: string; role: string; status: string; tools: string[] }>;
    };
    return registry.shadows;
  } catch {
    return [];
  }
}

/** Load tasks from SQLite (graceful fallback) */
function loadTasks(): TaskRow[] {
  try {
    const { requireNodeSqlite } = require("../memory/sqlite.js") as {
      requireNodeSqlite: () => {
        DatabaseSync: new (path: string) => {
          prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] };
        };
      };
    };
    const sqlite = requireNodeSqlite();
    const dbPath = path.join(os.homedir(), ".donna", "memory", "index.db");
    const db = new sqlite.DatabaseSync(dbPath);
    return db
      .prepare("SELECT * FROM shadow_tasks ORDER BY priority DESC, created_at DESC LIMIT 50")
      .all() as TaskRow[];
  } catch {
    return [];
  }
}

/** Load notifications from SQLite (graceful fallback) */
function loadNotifications(): NotificationRow[] {
  try {
    const { requireNodeSqlite } = require("../memory/sqlite.js") as {
      requireNodeSqlite: () => {
        DatabaseSync: new (path: string) => {
          prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] };
        };
      };
    };
    const sqlite = requireNodeSqlite();
    const dbPath = path.join(os.homedir(), ".donna", "memory", "index.db");
    const db = new sqlite.DatabaseSync(dbPath);
    return db
      .prepare("SELECT * FROM shadow_notifications ORDER BY created_at DESC LIMIT 10")
      .all() as NotificationRow[];
  } catch {
    return [];
  }
}

/** Load last 10 heartbeat log entries from Jima's log */
async function loadHeartbeatLog(): Promise<HeartbeatLogEntry[]> {
  try {
    const logPath = path.join(os.homedir(), ".donna", "shadows", "Jima", "heartbeat.log.jsonl");
    const raw = await fs.readFile(logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    // Take last 10
    return lines
      .slice(-10)
      .map((line) => JSON.parse(line) as HeartbeatLogEntry)
      .toReversed();
  } catch {
    return [];
  }
}

/** Load evolution state */
async function loadEvolution(): Promise<EvolutionSnapshot | null> {
  try {
    const raw = await fs.readFile(path.join(os.homedir(), ".donna", "evolution.json"), "utf-8");
    const state = JSON.parse(raw) as {
      level: number;
      stats: { xp: number; streakDays: number; totalInteractions: number };
    };
    // Rank mapping
    const ranks: Record<number, { rank: string; title: string; nextXp: number | null }> = {
      1: { rank: "E", title: "Iniciante", nextXp: 100 },
      2: { rank: "D", title: "Aprendiz", nextXp: 500 },
      3: { rank: "C", title: "Assistente", nextXp: 2000 },
      4: { rank: "B", title: "Estrategista", nextXp: 5000 },
      5: { rank: "A", title: "Autonoma", nextXp: 15000 },
      6: { rank: "S", title: "Mestre", nextXp: 50000 },
      7: { rank: "SS", title: "Lenda", nextXp: 150000 },
      8: { rank: "SSS", title: "Transcendente", nextXp: null },
    };
    const r = ranks[state.level] ?? ranks[1];
    return {
      level: state.level,
      rank: r.rank,
      title: r.title,
      xp: state.stats.xp,
      nextXp: r.nextXp,
      streakDays: state.stats.streakDays,
      totalInteractions: state.stats.totalInteractions,
    };
  } catch {
    return null;
  }
}

/** Load AIOX project status from stories + PRD */
async function loadAIOXStatus(): Promise<AIOXMetadata | null> {
  try {
    const storiesDir = path.join(os.homedir(), "donna", "docs", "stories");
    const prdPath = path.join(os.homedir(), "donna", "scripts", "ralph", "prd.json");

    // Count stories from files
    const files = await fs.readdir(storiesDir).catch(() => [] as string[]);
    const storyFiles = files.filter((f) => f.endsWith(".md") && f.startsWith("story-"));
    let completed = 0;
    for (const file of storyFiles) {
      const content = await fs.readFile(path.join(storiesDir, file), "utf-8").catch(() => "");
      if (/\*\*Status:\*\*\s*\[x\]/.test(content)) {
        completed++;
      }
    }

    // Find current epic from PRD
    let currentEpic: string | null = null;
    let pendingTasks = 0;
    try {
      const raw = await fs.readFile(prdPath, "utf-8");
      const prd = JSON.parse(raw) as {
        stories: Array<{ title: string; status: string; tasks: Array<{ status: string }> }>;
      };
      const active = prd.stories.find((s) => s.status !== "done");
      currentEpic = active?.title ?? null;
      pendingTasks = prd.stories
        .flatMap((s) => s.tasks ?? [])
        .filter((t) => t.status !== "done" && t.status !== "completed").length;
    } catch {
      /* no PRD */
    }

    const total = storyFiles.length;
    return {
      currentEpic,
      totalStories: total,
      completedStories: completed,
      pendingTasks,
      confidenceScore: total > 0 ? Math.round((completed / total) * 100) : 0,
      errorRate: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Handle GET /api/mission-control
 * Returns false if the request doesn't match this route.
 */
export async function handleMissionControlRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/mission-control") {
    return false;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "text/plain");
    res.end("Method Not Allowed");
    return true;
  }

  // CORS for dashboard
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const [shadows, tasks, notifications, heartbeat, evolution, aiox] = await Promise.all([
    loadShadowRegistry(),
    Promise.resolve(loadTasks()),
    Promise.resolve(loadNotifications()),
    loadHeartbeatLog(),
    loadEvolution(),
    loadAIOXStatus(),
  ]);

  // Enrich shadows with current task
  const shadowStatuses: ShadowStatus[] = shadows.map((s) => {
    const activeTask = tasks.find(
      (t) => t.shadow_name === s.name && (t.status === "in_progress" || t.status === "pending"),
    );
    return {
      name: s.name,
      role: s.role,
      status: activeTask
        ? activeTask.status === "in_progress"
          ? "working"
          : "pending"
        : "sleeping",
      tools: s.tools,
      currentTask: activeTask?.description ?? null,
    };
  });

  const body: MissionControlResponse = {
    shadows: shadowStatuses,
    tasks,
    notifications,
    heartbeat,
    evolution,
    aiox,
  };

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
  return true;
}

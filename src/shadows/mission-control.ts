/**
 * Shadow Mission Control — CRUD for shadow_tasks and shadow_notifications.
 * Used by Igris to delegate missions and by all shadows to update task status.
 */

import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { requireNodeSqlite } from "../memory/sqlite.js";

type ShadowTask = {
  id: string;
  shadow_name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: number;
  created_at: string;
  updated_at: string;
};

type ShadowNotification = {
  id: string;
  from_shadow: string;
  to_shadow: string;
  message: string;
  is_read: number;
  task_id: string | null;
  created_at: string;
};

let _db: ReturnType<typeof requireNodeSqlite>["DatabaseSync"]["prototype"] | null = null;

function getDb() {
  if (_db) {
    return _db;
  }
  const sqlite = requireNodeSqlite();
  const dbPath = path.join(os.homedir(), ".donna", "memory", "index.db");
  _db = new sqlite.DatabaseSync(dbPath);
  return _db;
}

// --- Tasks ---

export function createTask(shadowName: string, description: string, priority = 0): ShadowTask {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO shadow_tasks (id, shadow_name, description, status, priority, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(id, shadowName, description, priority, now, now);
  return {
    id,
    shadow_name: shadowName,
    description,
    status: "pending",
    priority,
    created_at: now,
    updated_at: now,
  };
}

export function getPendingTasks(shadowName: string): ShadowTask[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM shadow_tasks WHERE shadow_name = ? AND status IN ('pending', 'in_progress') ORDER BY priority DESC, created_at ASC`,
    )
    .all(shadowName) as ShadowTask[];
}

export function updateTaskStatus(
  taskId: string,
  status: "pending" | "in_progress" | "completed" | "failed",
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`UPDATE shadow_tasks SET status = ?, updated_at = ? WHERE id = ?`).run(
    status,
    now,
    taskId,
  );
}

// --- Notifications ---

export function sendNotification(
  fromShadow: string,
  message: string,
  taskId?: string,
  toShadow = "Igris",
): ShadowNotification {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO shadow_notifications (id, from_shadow, to_shadow, message, is_read, task_id, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, fromShadow, toShadow, message, taskId ?? null, now);
  return {
    id,
    from_shadow: fromShadow,
    to_shadow: toShadow,
    message,
    is_read: 0,
    task_id: taskId ?? null,
    created_at: now,
  };
}

export function getUnreadNotifications(toShadow: string): ShadowNotification[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM shadow_notifications WHERE to_shadow = ? AND is_read = 0 ORDER BY created_at ASC`,
    )
    .all(toShadow) as ShadowNotification[];
}

export function markNotificationsRead(toShadow: string): void {
  const db = getDb();
  db.prepare(`UPDATE shadow_notifications SET is_read = 1 WHERE to_shadow = ? AND is_read = 0`).run(
    toShadow,
  );
}

/**
 * Build a context block summarizing pending tasks for injection into shadow system prompt.
 * Returns empty string if no tasks pending.
 */
export function buildTaskContextBlock(shadowName: string): string {
  try {
    const tasks = getPendingTasks(shadowName);
    if (tasks.length === 0) {
      return "";
    }

    const lines = ["## Mission Control — Pending Tasks", ""];
    for (const t of tasks) {
      lines.push(`- [${t.status}] (priority:${t.priority}) ${t.description} — id:\`${t.id}\``);
    }
    lines.push(
      "",
      "Update task status with: UPDATE shadow_tasks SET status='completed' WHERE id='<task-id>'",
      "Notify Igris when done: INSERT INTO shadow_notifications (id, from_shadow, to_shadow, message, task_id) VALUES (...)",
    );
    return lines.join("\n");
  } catch {
    // DB not available — graceful degradation
    return "";
  }
}

/**
 * Build a context block for Igris with unread notifications.
 */
export function buildNotificationContextBlock(): string {
  try {
    const notifs = getUnreadNotifications("Igris");
    if (notifs.length === 0) {
      return "";
    }

    const lines = ["## Mission Control — Unread Notifications", ""];
    for (const n of notifs) {
      lines.push(
        `- From **${n.from_shadow}**: ${n.message}${n.task_id ? ` (task: \`${n.task_id}\`)` : ""}`,
      );
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

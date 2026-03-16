import type { Migration } from "./types.js";

/**
 * Mission Control schema: shadow_tasks and shadow_notifications tables.
 * Enables Igris to delegate missions and shadows to report back.
 */
export const v002ShadowMissionControl: Migration = {
  version: 2,
  description: "Mission Control: shadow_tasks and shadow_notifications tables",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shadow_tasks (
        id TEXT PRIMARY KEY,
        shadow_name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_shadow_tasks_shadow ON shadow_tasks(shadow_name);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shadow_tasks_status ON shadow_tasks(status);`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS shadow_notifications (
        id TEXT PRIMARY KEY,
        from_shadow TEXT NOT NULL,
        to_shadow TEXT NOT NULL DEFAULT 'Igris',
        message TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        task_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES shadow_tasks(id)
      );
    `);

    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_shadow_notif_to ON shadow_notifications(to_shadow, is_read);`,
    );
  },
};

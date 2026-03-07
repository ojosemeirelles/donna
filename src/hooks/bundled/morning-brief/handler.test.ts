import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CronStoreFile } from "../../../cron/types.js";
import { createHookEvent } from "../../hooks.js";
import {
  MORNING_BRIEF_JOB_ID,
  buildMorningBriefJob,
  buildMorningBriefPrompt,
  loadMorningBriefConfig,
  type MorningBriefConfig,
} from "./handler.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpDir = "";

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "donna-morning-brief-"));
});

afterAll(async () => {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

// ---------------------------------------------------------------------------
// buildMorningBriefPrompt
// ---------------------------------------------------------------------------

describe("buildMorningBriefPrompt", () => {
  it("includes all sections by default", () => {
    const prompt = buildMorningBriefPrompt({});
    expect(prompt).toContain("📧");
    expect(prompt).toContain("📅");
    expect(prompt).toContain("✅");
    expect(prompt).toContain("🎯");
  });

  it("omits email section when sources.email is false", () => {
    const prompt = buildMorningBriefPrompt({ sources: { email: false } });
    expect(prompt).not.toContain("📧");
    expect(prompt).toContain("📅");
    expect(prompt).toContain("✅");
  });

  it("omits calendar section when sources.calendar is false", () => {
    const prompt = buildMorningBriefPrompt({ sources: { calendar: false } });
    expect(prompt).toContain("📧");
    expect(prompt).not.toContain("📅");
    expect(prompt).toContain("✅");
  });

  it("omits tasks section when sources.tasks is false", () => {
    const prompt = buildMorningBriefPrompt({ sources: { tasks: false } });
    expect(prompt).toContain("📧");
    expect(prompt).toContain("📅");
    expect(prompt).not.toContain("✅");
  });

  it("uses Portuguese by default", () => {
    const prompt = buildMorningBriefPrompt({});
    expect(prompt).toContain("Bom dia");
    expect(prompt).toContain("E-mails Prioritários");
  });

  it("uses English when language is 'en'", () => {
    const prompt = buildMorningBriefPrompt({ language: "en" });
    expect(prompt).toContain("Good morning");
    expect(prompt).toContain("Priority Emails");
  });

  it("includes focus section in all configurations", () => {
    const prompt = buildMorningBriefPrompt({
      sources: { email: false, calendar: false, tasks: false },
    });
    expect(prompt).toContain("🎯");
  });
});

// ---------------------------------------------------------------------------
// loadMorningBriefConfig
// ---------------------------------------------------------------------------

describe("loadMorningBriefConfig", () => {
  it("returns empty object when config file does not exist", async () => {
    const dir = path.join(tmpDir, "no-config");
    await fs.mkdir(dir, { recursive: true });
    const config = await loadMorningBriefConfig(dir);
    expect(config).toEqual({});
  });

  it("loads config from the expected path", async () => {
    const dir = path.join(tmpDir, "with-config");
    const configDir = path.join(dir, "hooks", "morning-brief");
    await fs.mkdir(configDir, { recursive: true });
    const expected: MorningBriefConfig = {
      time: "30 6 * * *",
      timezone: "America/Sao_Paulo",
      language: "pt",
      telegramChatId: "123456789",
      sources: { email: true, calendar: false, tasks: true },
    };
    await fs.writeFile(path.join(configDir, "config.json"), JSON.stringify(expected), "utf-8");

    const config = await loadMorningBriefConfig(dir);
    expect(config).toEqual(expected);
  });

  it("returns empty object when config file contains invalid JSON", async () => {
    const dir = path.join(tmpDir, "bad-config");
    const configDir = path.join(dir, "hooks", "morning-brief");
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, "config.json"), "not-json", "utf-8");

    const config = await loadMorningBriefConfig(dir);
    expect(config).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// buildMorningBriefJob
// ---------------------------------------------------------------------------

describe("buildMorningBriefJob", () => {
  it("uses defaults when config is empty", () => {
    const job = buildMorningBriefJob({});
    expect(job.id).toBe(MORNING_BRIEF_JOB_ID);
    expect(job.name).toBe("Morning Brief");
    expect(job.enabled).toBe(true);
    expect(job.schedule).toMatchObject({ kind: "cron", expr: "0 7 * * *" });
    expect(job.sessionTarget).toBe("isolated");
    expect(job.payload.kind).toBe("agentTurn");
  });

  it("uses configured cron expression and timezone", () => {
    const job = buildMorningBriefJob({
      time: "30 6 * * 1-5",
      timezone: "America/Sao_Paulo",
    });
    expect(job.schedule).toMatchObject({
      kind: "cron",
      expr: "30 6 * * 1-5",
      tz: "America/Sao_Paulo",
    });
  });

  it("sets deliver:false and no delivery when no telegramChatId", () => {
    const job = buildMorningBriefJob({});
    if (job.payload.kind !== "agentTurn") {
      throw new Error("expected agentTurn");
    }
    expect(job.payload.deliver).toBe(false);
    expect(job.delivery).toBeUndefined();
  });

  it("sets deliver:true and delivery when telegramChatId is provided", () => {
    const job = buildMorningBriefJob({ telegramChatId: "987654321" });
    if (job.payload.kind !== "agentTurn") {
      throw new Error("expected agentTurn");
    }
    expect(job.payload.deliver).toBe(true);
    expect(job.payload.to).toBe("987654321");
    expect(job.delivery?.mode).toBe("announce");
    expect(job.delivery?.channel).toBe("telegram");
    expect(job.delivery?.to).toBe("987654321");
  });

  it("sets lightContext:true for low-overhead runs", () => {
    const job = buildMorningBriefJob({});
    if (job.payload.kind !== "agentTurn") {
      throw new Error("expected agentTurn");
    }
    expect(job.payload.lightContext).toBe(true);
  });

  it("disables failure alerts", () => {
    const job = buildMorningBriefJob({});
    expect(job.failureAlert).toBe(false);
  });

  it("includes the prompt in the payload message", () => {
    const job = buildMorningBriefJob({});
    if (job.payload.kind !== "agentTurn") {
      throw new Error("expected agentTurn");
    }
    expect(job.payload.message).toContain("☀️");
    expect(job.payload.message.length).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// handler (with mocked cron store)
// ---------------------------------------------------------------------------

// vi.hoisted runs before imports, so the ref is available inside the vi.mock factory.
const cronStoreMock = vi.hoisted(() => {
  let store: CronStoreFile = { version: 1, jobs: [] };
  let failSave = false;
  return {
    getStore: () => store,
    setStore: (s: CronStoreFile) => {
      store = s;
    },
    reset: () => {
      store = { version: 1, jobs: [] };
      failSave = false;
    },
    setFailSave: (fail: boolean) => {
      failSave = fail;
    },
    shouldFailSave: () => failSave,
  };
});

vi.mock("../../../cron/store.js", () => ({
  resolveCronStorePath: () => "/mock/cron/jobs.json",
  loadCronStore: async () => structuredClone(cronStoreMock.getStore()),
  saveCronStore: async (_path: string, store: CronStoreFile) => {
    if (cronStoreMock.shouldFailSave()) {
      throw new Error("disk full");
    }
    cronStoreMock.setStore(structuredClone(store));
  },
}));

describe("handler", () => {
  let handler: (typeof import("./handler.js"))["default"];

  beforeAll(async () => {
    ({ default: handler } = await import("./handler.js"));
  });

  it("is a no-op for non-gateway events", async () => {
    const event = createHookEvent("command", "new", "agent:main:main", {});
    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("is a no-op for gateway events that are not startup", async () => {
    const event = createHookEvent("gateway", "reload", "gateway:reload", {});
    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("registers the cron job on first gateway:startup", async () => {
    cronStoreMock.reset();

    const event = createHookEvent("gateway", "startup", "gateway:startup", { cfg: undefined });
    await handler(event);

    const store = cronStoreMock.getStore();
    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0]?.id).toBe(MORNING_BRIEF_JOB_ID);
  });

  it("does not duplicate the job on subsequent startups (idempotent)", async () => {
    cronStoreMock.setStore({ version: 1, jobs: [buildMorningBriefJob({})] });

    const event = createHookEvent("gateway", "startup", "gateway:startup", { cfg: undefined });
    await handler(event);
    await handler(event); // second run

    expect(cronStoreMock.getStore().jobs).toHaveLength(1);
  });

  it("logs error and does not throw when saveCronStore rejects", async () => {
    cronStoreMock.reset();
    cronStoreMock.setFailSave(true);

    const event = createHookEvent("gateway", "startup", "gateway:startup", { cfg: undefined });
    await expect(handler(event)).resolves.toBeUndefined();

    cronStoreMock.setFailSave(false);
  });
});

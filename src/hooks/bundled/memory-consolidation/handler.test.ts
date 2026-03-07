import { describe, expect, it } from "vitest";
import {
  buildConsolidationJob,
  buildConsolidationPrompt,
  loadConsolidationConfig,
  MEMORY_CONSOLIDATION_JOB_ID,
} from "./handler.js";

// ---------------------------------------------------------------------------
// loadConsolidationConfig
// ---------------------------------------------------------------------------

describe("loadConsolidationConfig", () => {
  it("returns empty object when config file does not exist", async () => {
    const config = await loadConsolidationConfig("/nonexistent/state/dir");
    expect(config).toEqual({});
  });

  it("returns empty object for invalid path", async () => {
    const config = await loadConsolidationConfig("/dev/null/hooks");
    expect(config).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// buildConsolidationJob
// ---------------------------------------------------------------------------

describe("buildConsolidationJob", () => {
  it("uses the canonical MEMORY_CONSOLIDATION_JOB_ID", () => {
    const job = buildConsolidationJob({});
    expect(job.id).toBe(MEMORY_CONSOLIDATION_JOB_ID);
  });

  it("defaults to Sunday 21:00 cron expression", () => {
    const job = buildConsolidationJob({});
    expect(job.schedule.kind).toBe("cron");
    if (job.schedule.kind === "cron") {
      expect(job.schedule.expr).toBe("0 21 * * 0");
    }
  });

  it("respects custom cron expression", () => {
    const job = buildConsolidationJob({ time: "0 8 * * 0" });
    if (job.schedule.kind === "cron") {
      expect(job.schedule.expr).toBe("0 8 * * 0");
    }
  });

  it("respects custom timezone", () => {
    const job = buildConsolidationJob({ timezone: "America/Sao_Paulo" });
    if (job.schedule.kind === "cron") {
      expect(job.schedule.tz).toBe("America/Sao_Paulo");
    }
  });

  it("uses system timezone by default", () => {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const job = buildConsolidationJob({});
    if (job.schedule.kind === "cron") {
      expect(job.schedule.tz).toBe(systemTz);
    }
  });

  it("sets delivery mode to 'none' when no telegramChatId", () => {
    const job = buildConsolidationJob({});
    expect(job.delivery?.mode).toBe("none");
  });

  it("sets delivery mode to 'announce' with telegramChatId", () => {
    const job = buildConsolidationJob({ telegramChatId: "123456789" });
    expect(job.delivery?.mode).toBe("announce");
    expect(job.delivery?.channel).toBe("telegram");
    expect(job.delivery?.to).toBe("123456789");
  });

  it("sets deliver=false when no telegramChatId", () => {
    const job = buildConsolidationJob({});
    if (job.payload.kind === "agentTurn") {
      expect(job.payload.deliver).toBe(false);
    }
  });

  it("sets deliver=true when telegramChatId is provided", () => {
    const job = buildConsolidationJob({ telegramChatId: "987654321" });
    if (job.payload.kind === "agentTurn") {
      expect(job.payload.deliver).toBe(true);
    }
  });

  it("creates job in isolated session target", () => {
    const job = buildConsolidationJob({});
    expect(job.sessionTarget).toBe("isolated");
  });

  it("creates job in enabled state", () => {
    const job = buildConsolidationJob({});
    expect(job.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildConsolidationPrompt
// ---------------------------------------------------------------------------

describe("buildConsolidationPrompt", () => {
  it("returns a Portuguese prompt by default", () => {
    const prompt = buildConsolidationPrompt({ language: "pt" });
    expect(prompt).toMatch(/consolidação|memória/i);
  });

  it("returns an English prompt when language=en", () => {
    const prompt = buildConsolidationPrompt({ language: "en" });
    expect(prompt).toContain("consolidation");
  });

  it("includes memory file path reference", () => {
    const prompt = buildConsolidationPrompt({});
    expect(prompt).toContain("~/.donna/memory/");
  });

  it("references episodic episodes in prompt", () => {
    const prompt = buildConsolidationPrompt({});
    expect(prompt.toLowerCase()).toMatch(/episode|episód/);
  });
});

// ---------------------------------------------------------------------------
// handler — integration
// ---------------------------------------------------------------------------

describe("handler (default export)", () => {
  it("is a no-op for non-startup events", async () => {
    const { default: handlerFn } = await import("./handler.js");
    await expect(
      handlerFn({
        type: "message",
        action: "received",
        sessionKey: "test",
        context: {},
        timestamp: new Date(),
        messages: [],
      }),
    ).resolves.not.toThrow();
  });
});

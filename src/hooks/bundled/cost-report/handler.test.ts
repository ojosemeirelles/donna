import { describe, expect, it } from "vitest";
import {
  COST_REPORT_JOB_ID,
  buildCostReportJob,
  buildCostReportPrompt,
  loadCostReportConfig,
} from "./handler.js";

// ---------------------------------------------------------------------------
// loadCostReportConfig
// ---------------------------------------------------------------------------

describe("loadCostReportConfig", () => {
  it("returns empty object (all defaults) when config file does not exist", async () => {
    const config = await loadCostReportConfig("/nonexistent/state/dir");
    expect(config).toEqual({});
  });

  it("returns empty object when config file contains invalid JSON", async () => {
    // Using a path that will fail to read
    const config = await loadCostReportConfig("/dev/null/hooks");
    expect(config).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// buildCostReportJob
// ---------------------------------------------------------------------------

describe("buildCostReportJob", () => {
  it("uses the canonical COST_REPORT_JOB_ID", () => {
    const job = buildCostReportJob({});
    expect(job.id).toBe(COST_REPORT_JOB_ID);
  });

  it("defaults to '0 20 * * *' cron expression", () => {
    const job = buildCostReportJob({});
    expect(job.schedule.kind).toBe("cron");
    if (job.schedule.kind === "cron") {
      expect(job.schedule.expr).toBe("0 20 * * *");
    }
  });

  it("respects custom cron expression", () => {
    const job = buildCostReportJob({ time: "0 9 * * 1" });
    if (job.schedule.kind === "cron") {
      expect(job.schedule.expr).toBe("0 9 * * 1");
    }
  });

  it("respects custom timezone", () => {
    const job = buildCostReportJob({ timezone: "America/Sao_Paulo" });
    if (job.schedule.kind === "cron") {
      expect(job.schedule.tz).toBe("America/Sao_Paulo");
    }
  });

  it("uses system timezone by default", () => {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const job = buildCostReportJob({});
    if (job.schedule.kind === "cron") {
      expect(job.schedule.tz).toBe(systemTz);
    }
  });

  it("sets delivery mode to 'none' when no telegramChatId", () => {
    const job = buildCostReportJob({});
    expect(job.delivery?.mode).toBe("none");
  });

  it("sets delivery mode to 'announce' with telegramChatId", () => {
    const job = buildCostReportJob({ telegramChatId: "123456789" });
    expect(job.delivery?.mode).toBe("announce");
    expect(job.delivery?.channel).toBe("telegram");
    expect(job.delivery?.to).toBe("123456789");
  });

  it("sets lightContext true on the payload", () => {
    const job = buildCostReportJob({});
    if (job.payload.kind === "agentTurn") {
      expect(job.payload.lightContext).toBe(true);
    }
  });

  it("sets deliver=false when no telegramChatId", () => {
    const job = buildCostReportJob({});
    if (job.payload.kind === "agentTurn") {
      expect(job.payload.deliver).toBe(false);
    }
  });

  it("sets deliver=true when telegramChatId is provided", () => {
    const job = buildCostReportJob({ telegramChatId: "987654321" });
    if (job.payload.kind === "agentTurn") {
      expect(job.payload.deliver).toBe(true);
    }
  });

  it("creates job in isolated session target", () => {
    const job = buildCostReportJob({});
    expect(job.sessionTarget).toBe("isolated");
  });

  it("creates job in enabled state", () => {
    const job = buildCostReportJob({});
    expect(job.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildCostReportPrompt
// ---------------------------------------------------------------------------

describe("buildCostReportPrompt", () => {
  it("returns a Portuguese prompt by default (language=pt)", async () => {
    const prompt = await buildCostReportPrompt({ language: "pt" }, "");
    expect(prompt.toLowerCase()).toMatch(/custo|relat/);
  });

  it("returns an English prompt when language=en", async () => {
    const prompt = await buildCostReportPrompt({ language: "en" }, "");
    expect(prompt.toLowerCase()).toMatch(/cost|report/);
  });

  it("includes cost data in the prompt", async () => {
    const prompt = await buildCostReportPrompt({}, "");
    expect(prompt).toMatch(/\$[\d.]+/);
  });

  it("includes skill reference in the prompt", async () => {
    const prompt = await buildCostReportPrompt({}, "");
    expect(prompt).toContain("cost-report");
  });
});

// ---------------------------------------------------------------------------
// handler (default export) — integration tests
// ---------------------------------------------------------------------------

describe("handler (default export)", () => {
  it("is a no-op for non-startup events", async () => {
    const { default: handler } = await import("./handler.js");
    // Should not throw
    await expect(
      handler({
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

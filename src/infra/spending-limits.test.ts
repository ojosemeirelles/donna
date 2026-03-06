import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DonnaConfig } from "../config/config.js";
import { withEnvAsync } from "../test-utils/env.js";
import { checkSpendingLimits, SpendingLimitExceededError } from "./spending-limits.js";

const makeEntry = (opts: { cost?: number; timestamp?: string; role?: string }) => ({
  type: "message",
  timestamp: opts.timestamp ?? new Date().toISOString(),
  message: {
    role: opts.role ?? "assistant",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    usage: {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 150,
      ...(opts.cost !== undefined ? { cost: { total: opts.cost } } : {}),
    },
  },
});

describe("SpendingLimitExceededError", () => {
  it("formats a readable message for daily limit", () => {
    const err = new SpendingLimitExceededError("daily", 1.0, 1.05);
    expect(err.message).toContain("Daily");
    expect(err.message).toContain("$1.00");
    expect(err.name).toBe("SpendingLimitExceededError");
    expect(err.kind).toBe("daily");
    expect(err.limitUsd).toBe(1.0);
    expect(err.accumulatedUsd).toBe(1.05);
  });

  it("formats a readable message for session limit", () => {
    const err = new SpendingLimitExceededError("session", 0.5, 0.6234);
    expect(err.message).toContain("Session");
    expect(err.message).toContain("$0.50");
    expect(err.kind).toBe("session");
  });
});

describe("checkSpendingLimits", () => {
  const withStateDir = async <T>(stateDir: string, fn: () => Promise<T>): Promise<T> =>
    withEnvAsync({ DONNA_STATE_DIR: stateDir }, fn);

  it("passes when no spending config is set", async () => {
    const config: DonnaConfig = {};
    await expect(checkSpendingLimits({ config })).resolves.toBeUndefined();
  });

  it("passes when limits are zero (disabled)", async () => {
    const config: DonnaConfig = {
      spending: { maxDailyCostUsd: 0, maxSessionCostUsd: 0 },
    };
    await expect(checkSpendingLimits({ config })).resolves.toBeUndefined();
  });

  it("passes when daily cost is below the limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-daily-ok-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, "sess-a.jsonl");
    await fs.writeFile(sessionFile, JSON.stringify(makeEntry({ cost: 0.03 })) + "\n");

    const config: DonnaConfig = { spending: { maxDailyCostUsd: 1.0 } };

    await withStateDir(root, () =>
      expect(checkSpendingLimits({ config })).resolves.toBeUndefined(),
    );
  });

  it("throws SpendingLimitExceededError when daily cost meets the limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-daily-exceed-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, "sess-b.jsonl");
    // Write two entries totalling $1.50 today
    await fs.writeFile(
      sessionFile,
      [makeEntry({ cost: 1.0 }), makeEntry({ cost: 0.5 })]
        .map((e) => JSON.stringify(e))
        .join("\n") + "\n",
    );

    const config: DonnaConfig = { spending: { maxDailyCostUsd: 1.0 } };

    await withStateDir(root, async () => {
      const err = await checkSpendingLimits({ config }).catch((e) => e);
      expect(err).toBeInstanceOf(SpendingLimitExceededError);
      expect((err as SpendingLimitExceededError).kind).toBe("daily");
      expect((err as SpendingLimitExceededError).limitUsd).toBe(1.0);
      expect((err as SpendingLimitExceededError).accumulatedUsd).toBeCloseTo(1.5);
    });
  });

  it("passes when session cost is below the session limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-sess-ok-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, "sess-c.jsonl");
    await fs.writeFile(sessionFile, JSON.stringify(makeEntry({ cost: 0.1 })) + "\n");

    const config: DonnaConfig = { spending: { maxSessionCostUsd: 1.0 } };

    await withStateDir(root, () =>
      expect(checkSpendingLimits({ config, sessionFile })).resolves.toBeUndefined(),
    );
  });

  it("throws SpendingLimitExceededError when session cost meets the limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-sess-exceed-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, "sess-d.jsonl");
    await fs.writeFile(
      sessionFile,
      [makeEntry({ cost: 0.3 }), makeEntry({ cost: 0.3 })]
        .map((e) => JSON.stringify(e))
        .join("\n") + "\n",
    );

    const config: DonnaConfig = { spending: { maxSessionCostUsd: 0.5 } };

    await withStateDir(root, async () => {
      const err = await checkSpendingLimits({ config, sessionFile }).catch((e) => e);
      expect(err).toBeInstanceOf(SpendingLimitExceededError);
      expect((err as SpendingLimitExceededError).kind).toBe("session");
      expect((err as SpendingLimitExceededError).limitUsd).toBe(0.5);
      expect((err as SpendingLimitExceededError).accumulatedUsd).toBeCloseTo(0.6);
    });
  });

  it("checks daily limit before session limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-order-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const sessionFile = path.join(sessionsDir, "sess-e.jsonl");
    // Daily cost = $2.00 (over $1 daily limit); session cost = $2.00 (over $3 session limit)
    await fs.writeFile(
      sessionFile,
      [makeEntry({ cost: 1.0 }), makeEntry({ cost: 1.0 })]
        .map((e) => JSON.stringify(e))
        .join("\n") + "\n",
    );

    const config: DonnaConfig = {
      spending: { maxDailyCostUsd: 1.0, maxSessionCostUsd: 3.0 },
    };

    await withStateDir(root, async () => {
      const err = await checkSpendingLimits({ config, sessionFile }).catch((e) => e);
      expect(err).toBeInstanceOf(SpendingLimitExceededError);
      // Daily check runs first; session cap not reached
      expect((err as SpendingLimitExceededError).kind).toBe("daily");
    });
  });

  it("skips session check when no sessionId or sessionFile is provided", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spending-no-sess-"));
    const sessionsDir = path.join(root, "agents", "main", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    // No session files — daily total is $0
    const config: DonnaConfig = { spending: { maxDailyCostUsd: 5.0, maxSessionCostUsd: 0.01 } };

    // maxSessionCostUsd is very low, but without sessionFile there is nothing to check
    await withStateDir(root, () =>
      expect(checkSpendingLimits({ config })).resolves.toBeUndefined(),
    );
  });
});

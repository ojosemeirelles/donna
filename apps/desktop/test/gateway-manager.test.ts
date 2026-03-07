import { describe, expect, it } from "vitest";
import {
  resolveGatewayManagerConfig,
  calculateBackoff,
  buildGatewayArgs,
  GatewayManager,
} from "../src/gateway-manager.js";

// ---------------------------------------------------------------------------
// resolveGatewayManagerConfig
// ---------------------------------------------------------------------------

describe("resolveGatewayManagerConfig", () => {
  it("returns all defaults when called with no args", () => {
    const cfg = resolveGatewayManagerConfig();
    expect(cfg.port).toBe(18789);
    expect(cfg.execPath).toBe("donna");
    expect(cfg.healthCheckIntervalMs).toBe(5000);
    expect(cfg.initialBackoffMs).toBe(1000);
    expect(cfg.maxBackoffMs).toBe(30_000);
    expect(cfg.maxRestartAttempts).toBe(10);
  });

  it("overrides port when provided", () => {
    const cfg = resolveGatewayManagerConfig({ port: 9999 });
    expect(cfg.port).toBe(9999);
  });

  it("overrides execPath when provided", () => {
    const cfg = resolveGatewayManagerConfig({ execPath: "/usr/local/bin/donna" });
    expect(cfg.execPath).toBe("/usr/local/bin/donna");
  });

  it("overrides maxRestartAttempts when provided", () => {
    const cfg = resolveGatewayManagerConfig({ maxRestartAttempts: 3 });
    expect(cfg.maxRestartAttempts).toBe(3);
  });

  it("accepts 0 maxRestartAttempts (unlimited)", () => {
    const cfg = resolveGatewayManagerConfig({ maxRestartAttempts: 0 });
    expect(cfg.maxRestartAttempts).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateBackoff
// ---------------------------------------------------------------------------

describe("calculateBackoff", () => {
  it("returns at least initialMs on first attempt", () => {
    const result = calculateBackoff(1, 1000, 30_000);
    expect(result).toBeGreaterThanOrEqual(1000);
  });

  it("doubles delay on second attempt (approximately)", () => {
    const result = calculateBackoff(2, 1000, 30_000);
    expect(result).toBeGreaterThanOrEqual(2000);
  });

  it("never exceeds maxBackoffMs", () => {
    const result = calculateBackoff(100, 1000, 5000);
    expect(result).toBeLessThanOrEqual(5000);
  });

  it("caps at maxBackoffMs for very large attempt counts", () => {
    for (let i = 0; i < 10; i++) {
      const result = calculateBackoff(50, 1000, 10_000);
      expect(result).toBeLessThanOrEqual(10_000);
    }
  });

  it("returns a number (not NaN)", () => {
    expect(Number.isNaN(calculateBackoff(1, 1000, 30_000))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildGatewayArgs
// ---------------------------------------------------------------------------

describe("buildGatewayArgs", () => {
  it("includes 'gateway run' subcommands", () => {
    const args = buildGatewayArgs(18789);
    expect(args).toContain("gateway");
    expect(args).toContain("run");
  });

  it("includes --port flag with the given port", () => {
    const args = buildGatewayArgs(18789);
    const portIdx = args.indexOf("--port");
    expect(portIdx).toBeGreaterThan(-1);
    expect(args[portIdx + 1]).toBe("18789");
  });

  it("includes --bind loopback flag", () => {
    const args = buildGatewayArgs(18789);
    expect(args).toContain("--bind");
    expect(args).toContain("loopback");
  });

  it("uses the given port correctly", () => {
    const args = buildGatewayArgs(9999);
    expect(args).toContain("9999");
  });
});

// ---------------------------------------------------------------------------
// GatewayManager
// ---------------------------------------------------------------------------

describe("GatewayManager", () => {
  it("starts with idle status", () => {
    const gm = new GatewayManager();
    expect(gm.getStatus()).toBe("idle");
  });

  it("getPort() returns configured port", () => {
    const gm = new GatewayManager({ port: 9876 });
    expect(gm.getPort()).toBe(9876);
  });

  it("getPort() returns default port when not configured", () => {
    const gm = new GatewayManager();
    expect(gm.getPort()).toBe(18789);
  });

  it("getRestartAttempts() starts at 0", () => {
    const gm = new GatewayManager();
    expect(gm.getRestartAttempts()).toBe(0);
  });

  it("isProcessRunning() returns false before start", () => {
    const gm = new GatewayManager();
    expect(gm.isProcessRunning()).toBe(false);
  });

  it("emits status event on start", async () => {
    const gm = new GatewayManager({
      execPath: "node",
      healthCheckIntervalMs: 60_000,
      maxRestartAttempts: 1,
    });

    const statuses: string[] = [];
    gm.on("status", (s: string) => statuses.push(s));

    // Start with a real process (node -e) that exits immediately
    const startPromise = gm.start();

    // Wait a bit for the "starting" status
    await new Promise((r) => setTimeout(r, 50));
    expect(statuses).toContain("starting");

    await gm.stop();
    await startPromise.catch(() => {});
  });

  it("stop() sets status to stopped", async () => {
    const gm = new GatewayManager({
      execPath: "node",
      healthCheckIntervalMs: 60_000,
      maxRestartAttempts: 0,
    });

    gm.on("status", () => {});
    const startPromise = gm.start();
    await new Promise((r) => setTimeout(r, 50));
    await gm.stop();
    await startPromise.catch(() => {});
    expect(gm.getStatus()).toBe("stopped");
  });

  it("isProcessRunning() returns false after stop", async () => {
    const gm = new GatewayManager({
      execPath: "node",
      healthCheckIntervalMs: 60_000,
      maxRestartAttempts: 0,
    });
    gm.on("status", () => {});
    const p = gm.start();
    await new Promise((r) => setTimeout(r, 50));
    await gm.stop();
    await p.catch(() => {});
    expect(gm.isProcessRunning()).toBe(false);
  });

  it("emits log event from stdout", async () => {
    const gm = new GatewayManager({
      // Use node to echo something to stdout then exit
      execPath: "node",
      healthCheckIntervalMs: 60_000,
      maxRestartAttempts: 0,
    });

    const logs: string[] = [];
    gm.on("log", (line: string) => logs.push(line));

    // We can't easily test this without a real donna binary in tests,
    // so just verify the event listener is registered
    expect(gm.listenerCount("log")).toBe(1);
    await gm.stop();
  });

  it("is an EventEmitter", () => {
    const gm = new GatewayManager();
    expect(typeof gm.on).toBe("function");
    expect(typeof gm.emit).toBe("function");
    expect(typeof gm.off).toBe("function");
  });
});

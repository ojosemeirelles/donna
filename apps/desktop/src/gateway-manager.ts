/**
 * GatewayManager — spawns, monitors, and auto-restarts the Donna gateway process.
 *
 * Pure Node.js module (no Electron imports) — fully testable without Electron.
 *
 * Responsibilities:
 *   1. Spawn `donna gateway run --port <port>` as a child process.
 *   2. Monitor health via HTTP poll every healthCheckIntervalMs.
 *   3. Auto-restart on exit with exponential backoff (up to maxBackoffMs).
 *   4. Emit events for status changes: "starting" | "running" | "stopped" | "error".
 */

import { EventEmitter } from "node:events";
import http from "node:http";
import { type ChildProcess, spawn } from "node:child_process";

export type GatewayStatus = "idle" | "starting" | "running" | "stopped" | "error";

export type GatewayManagerConfig = {
  /** Port the gateway listens on. Default: 18789. */
  port?: number;
  /** Path to the donna executable. Default: "donna". */
  execPath?: string;
  /** Milliseconds between health checks. Default: 5000. */
  healthCheckIntervalMs?: number;
  /** Initial delay (ms) before first restart. Default: 1000. */
  initialBackoffMs?: number;
  /** Maximum backoff delay (ms). Default: 30000. */
  maxBackoffMs?: number;
  /** Maximum restart attempts before giving up (0 = unlimited). Default: 10. */
  maxRestartAttempts?: number;
};

export type GatewayManagerEvents = {
  status: (status: GatewayStatus, error?: Error) => void;
  log: (line: string) => void;
  exit: (code: number | null, signal: string | null) => void;
};

/** Resolves config with defaults applied. */
export function resolveGatewayManagerConfig(
  raw?: GatewayManagerConfig,
): Required<GatewayManagerConfig> {
  return {
    port: raw?.port ?? 18789,
    execPath: raw?.execPath ?? "donna",
    healthCheckIntervalMs: raw?.healthCheckIntervalMs ?? 5000,
    initialBackoffMs: raw?.initialBackoffMs ?? 1000,
    maxBackoffMs: raw?.maxBackoffMs ?? 30_000,
    maxRestartAttempts: raw?.maxRestartAttempts ?? 10,
  };
}

/**
 * Calculates the next backoff delay using exponential backoff with jitter.
 * Caps at maxBackoffMs.
 */
export function calculateBackoff(
  attempt: number,
  initialMs: number,
  maxMs: number,
): number {
  const base = initialMs * 2 ** (attempt - 1);
  const jitter = Math.random() * 0.2 * base; // ±20% jitter
  return Math.min(base + jitter, maxMs);
}

/**
 * Checks if the Donna gateway is responding at the given port.
 * Returns true if the /health endpoint responds with 2xx, false otherwise.
 */
export function checkGatewayHealth(port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/health", timeout: timeoutMs },
      (res) => {
        resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
        res.resume(); // drain the response
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Builds the CLI arguments for spawning the donna gateway.
 */
export function buildGatewayArgs(port: number): string[] {
  return ["gateway", "run", "--port", String(port), "--bind", "loopback"];
}

/**
 * GatewayManager — lifecycle controller for the Donna gateway subprocess.
 *
 * Usage:
 *   const gm = new GatewayManager({ port: 18789 });
 *   gm.on("status", (status) => console.log("Gateway:", status));
 *   await gm.start();
 */
export class GatewayManager extends EventEmitter {
  private readonly config: Required<GatewayManagerConfig>;
  private process: ChildProcess | null = null;
  private status: GatewayStatus = "idle";
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private restartAttempts = 0;
  private stopped = false;

  constructor(config?: GatewayManagerConfig) {
    super();
    this.config = resolveGatewayManagerConfig(config);
  }

  /** Returns the current gateway status. */
  getStatus(): GatewayStatus {
    return this.status;
  }

  /** Returns the configured port. */
  getPort(): number {
    return this.config.port;
  }

  /** Returns the number of restart attempts so far. */
  getRestartAttempts(): number {
    return this.restartAttempts;
  }

  /** Returns true if the gateway process is running (spawned). */
  isProcessRunning(): boolean {
    return this.process !== null && this.process.exitCode === null;
  }

  /** Starts the gateway. Resolves when the process is spawned. */
  async start(): Promise<void> {
    this.stopped = false;
    this.restartAttempts = 0;
    await this._spawn();
    this._startHealthCheck();
  }

  /**
   * Stops the gateway and disables auto-restart.
   * Sends SIGTERM and waits up to 5s for clean exit.
   */
  async stop(): Promise<void> {
    this.stopped = true;
    this._stopHealthCheck();

    if (this.process && this.process.exitCode === null) {
      this.process.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 5000);
        this.process?.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.process = null;
    this._setStatus("stopped");
  }

  private async _spawn(): Promise<void> {
    this._setStatus("starting");
    const args = buildGatewayArgs(this.config.port);

    const child = spawn(this.config.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    this.process = child;

    child.stdout?.on("data", (chunk: Buffer) => {
      this.emit("log", chunk.toString());
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      this.emit("log", chunk.toString());
    });

    child.once("exit", (code, signal) => {
      this.emit("exit", code, signal);
      this.process = null;

      if (!this.stopped) {
        this._scheduleRestart();
      } else {
        this._setStatus("stopped");
      }
    });

    child.once("error", (err) => {
      this._setStatus("error", err);
      if (!this.stopped) {
        this._scheduleRestart();
      }
    });
  }

  private _startHealthCheck(): void {
    this._stopHealthCheck();
    this.healthCheckTimer = setInterval(async () => {
      if (this.status === "starting" || this.status === "running") {
        const healthy = await checkGatewayHealth(this.config.port);
        if (healthy && this.status === "starting") {
          this._setStatus("running");
        } else if (!healthy && this.status === "running") {
          // Gateway stopped responding — wait for exit event to trigger restart
          this._setStatus("starting");
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  private _stopHealthCheck(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private _scheduleRestart(): void {
    if (this.stopped) {
      return;
    }

    if (
      this.config.maxRestartAttempts > 0 &&
      this.restartAttempts >= this.config.maxRestartAttempts
    ) {
      this._setStatus("error", new Error(`Max restart attempts (${this.config.maxRestartAttempts}) reached`));
      return;
    }

    this.restartAttempts++;
    const delay = calculateBackoff(
      this.restartAttempts,
      this.config.initialBackoffMs,
      this.config.maxBackoffMs,
    );

    setTimeout(async () => {
      if (!this.stopped) {
        await this._spawn();
      }
    }, delay);
  }

  private _setStatus(status: GatewayStatus, error?: Error): void {
    this.status = status;
    this.emit("status", status, error);
  }
}

/**
 * Standardized loading-state components with automatic accessibility support.
 *
 * Visual mode  — spinners, progress bars (osc-progress + @clack/prompts)
 * Accessible mode — plain text, no cursor manipulation, no ANSI escapes
 *
 * Both modes share the same API so callers do not need to branch.
 */

import { getOutputMode, type OutputMode } from "./accessibility.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface LoadingOptions {
  /** Human-readable message shown next to the spinner / progress indicator. */
  message: string;
  /**
   * Force a specific output mode.
   * When omitted, auto-detected via {@link getOutputMode}.
   */
  accessible?: boolean;
  /** Stream to write to (default: `process.stderr`). */
  stream?: NodeJS.WriteStream;
}

export interface LoadingHandle {
  /** Update the displayed message. */
  update(message: string): void;
  /** Stop the indicator, optionally printing a final message. */
  stop(finalMessage?: string): void;
}

export interface ProgressHandle extends LoadingHandle {
  /** Advance progress by `by` units (default 1). */
  increment(by?: number): void;
  /** Set progress to an absolute value. */
  setProgress(current: number): void;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a spinner indicator.
 *
 * - Visual: animated spinner via `@clack/prompts`
 * - Accessible: prints `"Loading: <message>"` once, updates print new lines
 */
export function createSpinner(opts: LoadingOptions): LoadingHandle {
  const mode = resolveMode(opts);

  if (mode === "accessible") {
    return createAccessibleSpinner(opts);
  }

  return createVisualSpinner(opts);
}

/**
 * Create a progress bar indicator.
 *
 * - Visual: animated bar using cursor manipulation
 * - Accessible: prints `"Progress: 0/<total> — <message>"` with updates
 */
export function createProgressBar(
  opts: LoadingOptions & { total: number },
): ProgressHandle {
  const mode = resolveMode(opts);

  if (mode === "accessible") {
    return createAccessibleProgressBar(opts);
  }

  return createVisualProgressBar(opts);
}

// ---------------------------------------------------------------------------
// Accessible implementations
// ---------------------------------------------------------------------------

function createAccessibleSpinner(opts: LoadingOptions): LoadingHandle {
  const stream = opts.stream ?? process.stderr;
  let stopped = false;

  stream.write(`Loading: ${opts.message}\n`);

  return {
    update(message: string) {
      if (stopped) return;
      stream.write(`Loading: ${message}\n`);
    },
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      if (finalMessage) {
        stream.write(`Done: ${finalMessage}\n`);
      } else {
        stream.write("Done.\n");
      }
    },
  };
}

function createAccessibleProgressBar(
  opts: LoadingOptions & { total: number },
): ProgressHandle {
  const stream = opts.stream ?? process.stderr;
  let current = 0;
  let stopped = false;
  const { total } = opts;

  stream.write(`Progress: 0/${total} — ${opts.message}\n`);

  return {
    update(message: string) {
      if (stopped) return;
      stream.write(`Progress: ${current}/${total} — ${message}\n`);
    },
    increment(by = 1) {
      if (stopped) return;
      current = Math.min(total, current + by);
      stream.write(`Progress: ${current}/${total} complete\n`);
    },
    setProgress(value: number) {
      if (stopped) return;
      current = Math.max(0, Math.min(total, value));
      stream.write(`Progress: ${current}/${total} complete\n`);
    },
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      if (finalMessage) {
        stream.write(`Done: ${finalMessage}\n`);
      } else {
        stream.write(`Done: ${total}/${total} complete\n`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Visual implementations
// ---------------------------------------------------------------------------

function createVisualSpinner(opts: LoadingOptions): LoadingHandle {
  const stream = opts.stream ?? process.stderr;
  let stopped = false;

  // Frames for a simple braille spinner (no dependency needed)
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let message = opts.message;

  const isTty = stream.isTTY;
  if (!isTty) {
    // Fallback: just print the message once, no animation
    stream.write(`${message}\n`);
    return {
      update(msg: string) {
        if (stopped) return;
        message = msg;
        stream.write(`${msg}\n`);
      },
      stop(finalMessage?: string) {
        if (stopped) return;
        stopped = true;
        if (finalMessage) stream.write(`${finalMessage}\n`);
      },
    };
  }

  const render = () => {
    const frame = frames[frameIndex % frames.length];
    stream.write(`\r\x1b[2K${frame} ${message}`);
    frameIndex++;
  };

  render();
  const interval = setInterval(render, 80);

  return {
    update(msg: string) {
      if (stopped) return;
      message = msg;
    },
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      stream.write("\r\x1b[2K");
      if (finalMessage) {
        stream.write(`${finalMessage}\n`);
      }
    },
  };
}

function createVisualProgressBar(
  opts: LoadingOptions & { total: number },
): ProgressHandle {
  const stream = opts.stream ?? process.stderr;
  let current = 0;
  let stopped = false;
  let message = opts.message;
  const { total } = opts;
  const isTty = stream.isTTY;

  const BAR_WIDTH = 30;

  const render = () => {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const filled = total > 0 ? Math.round((current / total) * BAR_WIDTH) : 0;
    const empty = BAR_WIDTH - filled;
    const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;

    if (isTty) {
      stream.write(`\r\x1b[2K${bar} ${percent}% ${message}`);
    } else {
      stream.write(`[${percent}%] ${message}\n`);
    }
  };

  render();

  return {
    update(msg: string) {
      if (stopped) return;
      message = msg;
      render();
    },
    increment(by = 1) {
      if (stopped) return;
      current = Math.min(total, current + by);
      render();
    },
    setProgress(value: number) {
      if (stopped) return;
      current = Math.max(0, Math.min(total, value));
      render();
    },
    stop(finalMessage?: string) {
      if (stopped) return;
      stopped = true;
      if (isTty) {
        stream.write("\r\x1b[2K");
      }
      if (finalMessage) {
        stream.write(`${finalMessage}\n`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveMode(opts: LoadingOptions): OutputMode {
  if (opts.accessible === true) return "accessible";
  if (opts.accessible === false) return "visual";
  return getOutputMode();
}

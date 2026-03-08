/**
 * Screen reader detection and accessible output mode selection.
 *
 * Heuristics check environment variables that indicate the user is running
 * a screen reader, a non-interactive terminal, or has explicitly requested
 * reduced visual output (NO_COLOR, TERM=dumb, CI, etc.).
 */

/** Well-known env vars that signal a screen reader or assistive tech. */
const SCREEN_READER_HINTS = [
  "NVDA",
  "JAWS",
  "VOICEOVER",
  "ORCA",
  "ACCESSIBILITY",
] as const;

/**
 * Detect whether a screen reader (or similar assistive technology) is likely
 * active, based on environment variables.
 *
 * Checks (any = true):
 * - `TERM=dumb` — minimal terminal, no cursor control
 * - `CI` is truthy — continuous integration, non-interactive
 * - `NO_COLOR` is set — user requested no color/decoration
 * - `ACCESSIBILITY` is truthy — explicit opt-in
 * - `NVDA`, `JAWS`, `VOICEOVER`, `ORCA` are set — assistive tech hints
 *
 * @param env - environment map (defaults to `process.env`)
 */
export function isScreenReaderActive(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // TERM=dumb: terminal cannot handle escape sequences
  if (env.TERM?.toLowerCase() === "dumb") {
    return true;
  }

  // CI environments are non-interactive by nature
  if (isTruthy(env.CI)) {
    return true;
  }

  // NO_COLOR (https://no-color.org/) — user explicitly wants plain output
  if (env.NO_COLOR !== undefined) {
    return true;
  }

  // Assistive-technology env vars
  for (const hint of SCREEN_READER_HINTS) {
    if (isTruthy(env[hint])) {
      return true;
    }
  }

  return false;
}

export type OutputMode = "visual" | "accessible";

/**
 * Determine the output mode for TUI components.
 *
 * - `"visual"` — spinners, colors, animations, cursor manipulation
 * - `"accessible"` — plain text, no animations, structured output
 *
 * @param env - environment map (defaults to `process.env`)
 */
export function getOutputMode(
  env: Record<string, string | undefined> = process.env,
): OutputMode {
  return isScreenReaderActive(env) ? "accessible" : "visual";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return true for "1", "true", "yes" (case-insensitive). */
function isTruthy(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

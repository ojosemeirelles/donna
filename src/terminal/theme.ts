import chalk, { Chalk } from "chalk";
import { LOBSTER_PALETTE, LOBSTER_PALETTE_LIGHT } from "./palette.js";

export type TerminalTheme = "dark" | "light";

/**
 * Detect whether the terminal has a dark or light background.
 *
 * Uses a simple heuristic chain:
 * 1. `DONNA_THEME` env var (explicit override: "dark" | "light")
 * 2. `COLORFGBG` env var (format "fg;bg" — bg >= 8 is dark, < 8 is light)
 * 3. Known light-default terminals (Apple Terminal default profile)
 * 4. Default to dark (most modern terminals are dark)
 */
export function getTerminalTheme(): TerminalTheme {
  const explicit = process.env.DONNA_THEME?.trim().toLowerCase();
  if (explicit === "light") return "light";
  if (explicit === "dark") return "dark";

  // COLORFGBG is set by many terminals (xterm, rxvt, etc.)
  // Format: "foreground;background" where bg is an ANSI color index.
  // Low indices (0-6) are typically dark colors used as background in light themes.
  // Index 7+ (white, bright colors) are typically dark-theme backgrounds.
  const colorFgBg = process.env.COLORFGBG?.trim();
  if (colorFgBg) {
    const parts = colorFgBg.split(";");
    const bg = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isNaN(bg)) {
      // ANSI colors 0-6 as background suggest light theme;
      // 7 (white) or higher as background suggest dark theme.
      return bg < 7 ? "light" : "dark";
    }
  }

  return "dark";
}

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

const detectedTheme = getTerminalTheme();
const palette = detectedTheme === "light" ? LOBSTER_PALETTE_LIGHT : LOBSTER_PALETTE;

export const theme = {
  accent: hex(palette.accent),
  accentBright: hex(palette.accentBright),
  accentDim: hex(palette.accentDim),
  info: hex(palette.info),
  success: hex(palette.success),
  warn: hex(palette.warn),
  error: hex(palette.error),
  muted: hex(palette.muted),
  heading: baseChalk.bold.hex(palette.accent),
  command: hex(palette.accentBright),
  option: hex(palette.warn),
} as const;

/** The detected terminal theme for the current session. */
export const terminalTheme: TerminalTheme = detectedTheme;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;

// Lobster palette tokens for CLI/UI theming. "lobster seam" == use this palette.
// Keep in sync with docs/cli/index.md (CLI palette section).

/** Dark terminal palette (default). High-saturation colors for dark backgrounds. */
export const LOBSTER_PALETTE = {
  accent: "#FF5A2D",
  accentBright: "#FF7A3D",
  accentDim: "#D14A22",
  info: "#FF8A5B",
  success: "#2FBF71",
  warn: "#FFB020",
  error: "#E23D2D",
  muted: "#8B7F77",
} as const;

/**
 * Light terminal palette. Darker/more saturated values for readability on
 * light terminal backgrounds. Mirrors design tokens `color-light.*`.
 */
export const LOBSTER_PALETTE_LIGHT = {
  accent: "#C43D1A",
  accentBright: "#D14A22",
  accentDim: "#A03015",
  info: "#C96835",
  success: "#16A34A",
  warn: "#D97706",
  error: "#DC2626",
  muted: "#6B6360",
} as const;

export type LobsterPalette = typeof LOBSTER_PALETTE;

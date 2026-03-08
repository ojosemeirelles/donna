/**
 * Playwright visual regression test configuration.
 *
 * This config drives full-page screenshot comparison tests against a running
 * Donna Control UI dev server. It is intentionally separate from the existing
 * vitest browser tests (which use @vitest/browser-playwright for component-level
 * assertions) -- here we care about whole-page visual fidelity.
 *
 * Usage:
 *   npx playwright test --config ui/tests/visual/visual-regression.config.ts
 *
 * The dev server must be running on VISUAL_BASE_URL (default http://localhost:5173).
 * Start it with: `cd ui && pnpm dev`
 */

import { defineConfig, devices } from "playwright/test";

const BASE_URL = process.env.VISUAL_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.visual.test.ts",

  /* Snapshot / screenshot settings */
  snapshotDir: "./snapshots",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{arg}{ext}",

  /* Allow a small pixel diff to absorb anti-aliasing across OSes */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
    },
  },

  /* Timeout per test (screenshots can be slow on first paint) */
  timeout: 30_000,

  /* Retry once -- font rendering can jitter on first run */
  retries: 1,

  /* Reporter */
  reporter: [["html", { open: "never" }], ["list"]],

  /* Shared settings for all projects/browsers below */
  use: {
    baseURL: BASE_URL,
    /* Wait for network idle before screenshotting */
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  /* Do NOT start the dev server automatically -- see README for rationale. */
  // webServer: {
  //   command: "pnpm dev",
  //   url: BASE_URL,
  //   reuseExistingServer: true,
  //   timeout: 60_000,
  // },
});

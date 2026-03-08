/**
 * Visual regression tests for the main Donna Control UI pages.
 *
 * Each test navigates to a page, waits for hydration, applies stabilisation
 * helpers (fonts, volatile element hiding), and captures a full-page screenshot
 * that is compared against the baseline stored in `./snapshots/`.
 *
 * Prerequisites:
 *   1. Dev server running: `cd ui && pnpm dev`  (default: http://localhost:5173)
 *   2. Playwright browsers installed: `npx playwright install chromium`
 *
 * Run:
 *   npx playwright test --config ui/tests/visual/visual-regression.config.ts
 *
 * Update baselines:
 *   npx playwright test --config ui/tests/visual/visual-regression.config.ts --update-snapshots
 */

import { expect, test } from "playwright/test";
import { prepareForScreenshot } from "./helpers.js";

/*
 * Key screens to capture.
 *
 * Selected based on navigation.ts TAB_GROUPS:
 *   - chat      (primary interaction surface)
 *   - overview   (dashboard / health)
 *   - channels   (connection management)
 *   - config     (settings form)
 *   - sessions   (session list)
 *
 * This covers the four tab groups (chat, control, agent, settings) with the
 * most visually distinct pages. Expand as the UI grows.
 */
const SCREENS: { name: string; path: string }[] = [
  { name: "chat", path: "/chat" },
  { name: "overview", path: "/overview" },
  { name: "channels", path: "/channels" },
  { name: "config", path: "/config" },
  { name: "sessions", path: "/sessions" },
];

test.describe("Visual Regression — Key Screens", () => {
  for (const screen of SCREENS) {
    test(`${screen.name} page matches baseline`, async ({ page }) => {
      await prepareForScreenshot(page, screen.path);

      await expect(page).toHaveScreenshot(`${screen.name}.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe("Visual Regression — Dark/Light Theme", () => {
  test("overview in dark mode", async ({ page }) => {
    // Force dark color scheme via media emulation.
    await page.emulateMedia({ colorScheme: "dark" });
    await prepareForScreenshot(page, "/overview");

    await expect(page).toHaveScreenshot("overview-dark.png", {
      fullPage: true,
    });
  });

  test("overview in light mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await prepareForScreenshot(page, "/overview");

    await expect(page).toHaveScreenshot("overview-light.png", {
      fullPage: true,
    });
  });
});

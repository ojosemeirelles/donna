/**
 * Shared helpers for visual regression tests.
 *
 * Provides page-level utilities: wait-for-hydration, dismiss overlays,
 * inject a stable font stack (to reduce cross-OS diff noise), etc.
 */

import type { Page } from "playwright/test";

/**
 * Navigate to a path and wait until the Lit app has rendered.
 * The Control UI registers `<openclaw-app>` as the root element; we wait for
 * its shadow root (or at least its first child) to appear.
 */
export async function navigateAndWait(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });

  // Wait for the Lit custom element to hydrate.
  await page.waitForFunction(
    () => {
      const app = document.querySelector("openclaw-app");
      if (!app) return false;
      // Lit elements expose `updateComplete`; wait for at least one child.
      return app.children.length > 0 || (app.shadowRoot?.children?.length ?? 0) > 0;
    },
    { timeout: 15_000 },
  );

  // Give CSS transitions / lazy-loaded chunks a moment to settle.
  await page.waitForTimeout(500);
}

/**
 * Inject a CSS override that forces a generic system font stack.
 * This avoids diffs caused by different font rendering across macOS / Linux / CI.
 */
export async function stabilizeFonts(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        font-family: Arial, Helvetica, sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
      }
    `,
  });
}

/**
 * Hide elements that change between runs (timestamps, live counters, etc.)
 * to reduce false-positive diffs.
 */
export async function hideVolatileElements(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Timestamps, uptimes, live counters */
      [data-testid="volatile"],
      .timestamp,
      .uptime,
      .live-counter,
      time {
        visibility: hidden !important;
      }
    `,
  });
}

/** Convenience: apply all stabilisation helpers at once. */
export async function prepareForScreenshot(page: Page, path: string): Promise<void> {
  await navigateAndWait(page, path);
  await stabilizeFonts(page);
  await hideVolatileElements(page);
  // One more frame for style injection to take effect.
  await page.waitForTimeout(200);
}

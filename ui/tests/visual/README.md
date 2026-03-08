# Visual Regression Tests — Donna Control UI

Full-page screenshot comparison tests using Playwright, independent from the
existing vitest browser tests.

## Prerequisites

1. **Playwright browsers** (one-time):

   ```bash
   npx playwright install chromium
   ```

2. **Dev server running** (in a separate terminal):

   ```bash
   cd ui && pnpm dev
   ```

   The server must be reachable at `http://localhost:5173` (default).
   Override with `VISUAL_BASE_URL` if needed.

## Running

```bash
# From the repo root:
npx playwright test --config ui/tests/visual/visual-regression.config.ts
```

First run creates baseline screenshots under `ui/tests/visual/snapshots/`.
Subsequent runs compare against those baselines.

## Updating Baselines

When a UI change is intentional:

```bash
npx playwright test \
  --config ui/tests/visual/visual-regression.config.ts \
  --update-snapshots
```

Review the new screenshots, then commit them.

## Reviewing Diffs

Failed tests generate an HTML report:

```bash
npx playwright show-report
```

The report shows side-by-side diffs (expected vs actual vs diff image).

## Configuration

- **Config file:** `ui/tests/visual/visual-regression.config.ts`
- **Snapshot dir:** `ui/tests/visual/snapshots/`
- **Diff threshold:** 1% max pixel ratio, 0.2 color threshold
- **Viewports:** Desktop (1280x720) and Mobile (Pixel 5)
- **Animations:** Disabled during capture to avoid flaky diffs

## Adding New Screens

Edit `pages.visual.test.ts` and add an entry to the `SCREENS` array:

```typescript
{ name: "my-new-page", path: "/my-new-page" },
```

Run with `--update-snapshots` to generate the baseline.

## CI Integration

To run in CI, add a step after the dev server is started:

```yaml
- name: Visual regression tests
  run: |
    cd ui && pnpm dev &
    sleep 5
    npx playwright test --config ui/tests/visual/visual-regression.config.ts
```

Alternatively, enable the `webServer` block in the config file to let
Playwright manage the dev server lifecycle automatically.

Baseline screenshots should be committed to the repo so CI can compare against
them. Consider adding `ui/tests/visual/snapshots/` to `.gitattributes` with
Git LFS for large binary tracking.

## Stabilisation Helpers

The test helpers (`helpers.ts`) apply several techniques to reduce
false-positive diffs across different environments:

- **Font stabilisation:** Overrides all fonts to Arial/Helvetica.
- **Volatile element hiding:** Hides timestamps, live counters, etc.
- **Network idle wait:** Ensures all lazy chunks have loaded.
- **Animation disabling:** Configured at the Playwright level.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests fail on first run | Expected — first run creates baselines, second run compares. |
| Font rendering diffs | Ensure `stabilizeFonts()` is called (see `helpers.ts`). |
| Timeout waiting for app | Check that the dev server is running and accessible. |
| Flaky diffs on CI | Increase `maxDiffPixelRatio` in the config, or pin a Docker image. |

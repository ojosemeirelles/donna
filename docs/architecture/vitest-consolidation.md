# Vitest Config Consolidation

## Current State (10 configs)

| # | Config | Include Pattern | Pool | Timeout | Special Settings |
|---|--------|----------------|------|---------|------------------|
| 1 | `vitest.config.ts` | `src/**`, `extensions/**`, `test/**`, 4 specific `ui/` files | forks | 120s (hook 180s on Windows) | Base config. Aliases for `donna/plugin-sdk/*`. Coverage V8 with 70% thresholds. `unstubEnvs`, `unstubGlobals`. Setup: `test/setup.ts`. Excludes `*.live.test.ts` and `*.e2e.test.ts` |
| 2 | `vitest.unit.config.ts` | Inherits base, filters out `extensions/` patterns | forks (inherited) | inherited | Excludes `src/gateway/**`, `extensions/**`, `src/telegram/**`, `src/discord/**`, `src/web/**`, `src/browser/**`, `src/line/**`, `src/agents/**`, `src/auto-reply/**`, `src/commands/**`. Used by CI (bun lane), `test:fast`, `test:coverage` |
| 3 | `vitest.channels.config.ts` | `src/telegram/**`, `src/discord/**`, `src/web/**`, `src/browser/**`, `src/line/**` | forks (inherited) | inherited | Excludes `src/gateway/**`, `extensions/**` |
| 4 | `vitest.gateway.config.ts` | `src/gateway/**/*.test.ts` | forks (inherited) | inherited | Uses `createScopedVitestConfig` helper. Script adds `--pool=forks` (redundant, already base default) |
| 5 | `vitest.extensions.config.ts` | `extensions/**/*.test.ts` | forks (inherited) | inherited | Uses `createScopedVitestConfig` helper |
| 6 | `vitest.e2e.config.ts` | `test/**/*.e2e.test.ts`, `src/**/*.e2e.test.ts` | forks (explicit) | inherited | Custom worker count (CI: 25% CPUs, local: 1). `silent: !DONNA_E2E_VERBOSE`. Removes `*.e2e.test.ts` from exclude |
| 7 | `vitest.live.config.ts` | `src/**/*.live.test.ts` | forks (inherited) | inherited | `maxWorkers: 1`. Removes `*.live.test.ts` from exclude. Requires `DONNA_LIVE_TEST=1` env |
| 8 | `apps/desktop/vitest.config.ts` | `test/**/*.test.ts` | default (threads) | default (5s) | Standalone. Environment: node. No aliases, no setup, no coverage. Minimal config |
| 9 | `ui/vitest.config.ts` | `src/**/*.test.ts` | default | default | Browser mode (Playwright/chromium, headless). Completely different environment |
| 10 | `ui/vitest.node.config.ts` | `src/**/*.node.test.ts` | default | 120s | Node environment. For pure logic tests without Playwright |

### Helper File
- `vitest.scoped-config.ts` -- factory function used by configs #4 and #5. Inherits base, overrides only `include`.

## Analysis

### Shared Settings (configs 1-7)
All root configs inherit from `vitest.config.ts` (base). They share:
- `donna/plugin-sdk` aliases
- `pool: "forks"`
- `testTimeout: 120_000`
- `unstubEnvs: true`, `unstubGlobals: true`
- `setupFiles: ["test/setup.ts"]`
- Worker count (except live=1, e2e=custom)

The only differences between configs 2-5 are **include/exclude patterns** -- they partition `src/` into slices (unit, channels, gateway, extensions).

### Standalone Configs (8-10)
- `apps/desktop/vitest.config.ts` -- isolated workspace package, minimal tests, no overlap
- `ui/vitest.config.ts` -- browser mode (Playwright), fundamentally different runtime
- `ui/vitest.node.config.ts` -- node tests for UI logic, separate from browser

### Overlap Map

| Config | Overlap With | Nature |
|--------|-------------|--------|
| unit (2) | channels (3) + gateway (4) + extensions (5) | Complementary partitions of base (1). Together they equal base. |
| channels (3) | unit (2) | Inverse: what unit excludes, channels includes (for channel dirs) |
| gateway (4) | unit (2) | Inverse: gateway tests excluded from unit |
| extensions (5) | unit (2) | Inverse: extensions excluded from unit |
| base (1) | unit+channels+gateway+extensions | Superset of all four |
| e2e (6) | none | Different file pattern (`*.e2e.test.ts`) |
| live (7) | none | Different file pattern (`*.live.test.ts`), needs real API keys |

### Key Insight
Configs 2 (unit), 3 (channels), 4 (gateway), and 5 (extensions) are **partitions** of config 1 (base). Running base already runs all of them. The partitions exist only for targeted/faster CI runs.

## Proposed State (5 configs)

| # | Config | Merges | Include Pattern | Rationale |
|---|--------|--------|----------------|-----------|
| 1 | `vitest.config.ts` (base) | Stays as-is | `src/**`, `extensions/**`, `test/**`, specific `ui/` files | Remains the single source of truth. `pnpm test` runs everything. No change needed. |
| 2 | `vitest.unit.config.ts` | Absorbs channels (3) + gateway (4) + extensions (5) via Vitest **workspace projects** | All `src/**/*.test.ts` + `extensions/**/*.test.ts` partitioned into named projects | One config with named projects allows `vitest --project=unit`, `--project=channels`, `--project=gateway`, `--project=extensions`. Eliminates 3 config files. |
| 3 | `vitest.e2e.config.ts` | Stays as-is | `**/*.e2e.test.ts` | Unique worker/silence settings. Cannot merge with unit tests. |
| 4 | `vitest.live.config.ts` | Stays as-is | `**/*.live.test.ts` | Unique: maxWorkers=1, needs real API keys, different execution model. |
| 5 | `ui/vitest.config.ts` + `ui/vitest.node.config.ts` | Merge into workspace with 2 projects | browser project + node project | Vitest workspace supports mixed environments. One config, two projects. |

### Eliminated Configs
| Config | Fate |
|--------|------|
| `vitest.channels.config.ts` | Merged into workspace project inside `vitest.unit.config.ts` |
| `vitest.gateway.config.ts` | Merged into workspace project inside `vitest.unit.config.ts` |
| `vitest.extensions.config.ts` | Merged into workspace project inside `vitest.unit.config.ts` |
| `vitest.scoped-config.ts` | No longer needed (was only used by gateway + extensions) |
| `ui/vitest.node.config.ts` | Merged into `ui/vitest.config.ts` workspace |

### Desktop stays untouched
`apps/desktop/vitest.config.ts` is a separate workspace package with its own `vitest` dependency (v3). It does not interact with root configs and should remain independent. It is NOT counted toward the "root config" total since it lives in a workspace subpackage.

### Final Count
- **Root:** 4 configs (base, unit-workspace, e2e, live)
- **UI:** 1 config (workspace with browser + node projects)
- **Desktop:** 1 config (unchanged, workspace-scoped)
- **Total:** 6 files, but only **5 logical configs** (desktop is isolated workspace)

## Migration Steps

### Step 1: Create unit workspace config
Replace `vitest.unit.config.ts` content with a Vitest workspace definition using `defineWorkspace` or `projects` array:

```ts
// vitest.unit.config.ts
import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

const base = baseConfig as unknown as Record<string, unknown>;
const baseTest = (baseConfig as { test?: Record<string, unknown> }).test ?? {};
const baseExclude = (baseTest.exclude as string[]) ?? [];

export default defineConfig({
  ...base,
  test: {
    ...baseTest,
    workspace: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: [
            ...baseExclude,
            "src/gateway/**",
            "src/telegram/**", "src/discord/**", "src/web/**",
            "src/browser/**", "src/line/**",
            "src/agents/**", "src/auto-reply/**", "src/commands/**",
            "extensions/**",
          ],
        },
      },
      {
        test: {
          name: "channels",
          include: [
            "src/telegram/**/*.test.ts",
            "src/discord/**/*.test.ts",
            "src/web/**/*.test.ts",
            "src/browser/**/*.test.ts",
            "src/line/**/*.test.ts",
          ],
          exclude: [...baseExclude, "src/gateway/**", "extensions/**"],
        },
      },
      {
        test: {
          name: "gateway",
          include: ["src/gateway/**/*.test.ts"],
          exclude: baseExclude,
        },
      },
      {
        test: {
          name: "extensions",
          include: ["extensions/**/*.test.ts"],
          exclude: baseExclude,
        },
      },
    ],
  },
});
```

### Step 2: Update package.json scripts

| Old Script | New Script |
|-----------|------------|
| `"test:channels": "vitest run --config vitest.channels.config.ts"` | `"test:channels": "vitest run --config vitest.unit.config.ts --project=channels"` |
| `"test:extensions": "vitest run --config vitest.extensions.config.ts"` | `"test:extensions": "vitest run --config vitest.unit.config.ts --project=extensions"` |
| `"test:gateway": "vitest run --config vitest.gateway.config.ts --pool=forks"` | `"test:gateway": "vitest run --config vitest.unit.config.ts --project=gateway"` |
| `"test:fast": "vitest run --config vitest.unit.config.ts"` | `"test:fast": "vitest run --config vitest.unit.config.ts"` (unchanged -- runs all projects) |
| `"test:coverage": "vitest run --config vitest.unit.config.ts --coverage"` | `"test:coverage": "vitest run --config vitest.unit.config.ts --coverage"` (unchanged) |
| `"test:sectriage"` | Update both config references |

### Step 3: Merge UI configs
Convert `ui/vitest.config.ts` to use workspace projects:

```ts
// ui/vitest.config.ts
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: "browser",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.node.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", name: "chromium" }],
            headless: true,
            ui: false,
          },
        },
      },
      {
        test: {
          name: "node",
          include: ["src/**/*.node.test.ts"],
          environment: "node",
          testTimeout: 120_000,
        },
      },
    ],
  },
});
```

### Step 4: Delete obsolete files
- `vitest.channels.config.ts`
- `vitest.gateway.config.ts`
- `vitest.extensions.config.ts`
- `vitest.scoped-config.ts`
- `ui/vitest.node.config.ts`

### Step 5: Update CI references
- `.github/workflows/ci.yml` line 132: uses `vitest.unit.config.ts` -- no change needed
- Verify `test:sectriage` script still works with new `vitest.unit.config.ts`
- No other CI files reference the deleted configs directly

### Step 6: Validate
Run each command and verify test counts match before vs after:
1. `pnpm test` -- should run same total tests
2. `pnpm test:fast` -- should run same unit tests
3. `pnpm test:channels` -- verify via `--project=channels`
4. `pnpm test:gateway` -- verify via `--project=gateway`
5. `pnpm test:extensions` -- verify via `--project=extensions`
6. `pnpm test:e2e` -- unchanged
7. `pnpm test:live` -- unchanged
8. `pnpm test:ui` -- verify both browser and node tests run

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Vitest workspace `projects` may not inherit base config aliases/setup | Test locally: verify `donna/plugin-sdk` alias resolves in all projects. May need to hoist shared config. |
| `--project` flag may not work with `--coverage` | Test `pnpm test:coverage` after migration. Coverage config lives in base, should propagate. |
| `test:sectriage` uses both gateway and unit configs sequentially | Rewrite to single command: `vitest run --config vitest.unit.config.ts --project=gateway --project=unit` |
| UI workspace merge may conflict with Playwright browser provider | Vitest 4.x supports mixed browser/node projects in workspace. Verify with `pnpm --dir ui test`. |
| Desktop uses Vitest v3, root uses v4 | Keep desktop isolated. No merge attempted. |

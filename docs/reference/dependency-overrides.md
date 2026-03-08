# Dependency Overrides Audit

Last updated: 2026-03-08

This document audits all 11 `pnpm.overrides` entries in the root `package.json`,
documenting why each exists, whether the upstream issue is fixed, and a
keep/remove/monitor recommendation.

## Summary Table

| # | Package | Forced Version | Reason | CVE / Advisory | Status |
|---|---------|---------------|--------|----------------|--------|
| 1 | `hono` | `4.11.10` | Pin for `@buape/carbon` compatibility | None known | **Monitor** |
| 2 | `fast-xml-parser` | `5.3.8` | pnpm audit vulnerability in Google extension path | Prototype pollution / entity expansion | **Keep** |
| 3 | `request` | `npm:@cypress/request@3.0.10` | Deprecated `request` replaced with maintained fork | SSRF / cookie leak advisories on original `request` | **Keep** |
| 4 | `request-promise` | `npm:@cypress/request-promise@5.0.0` | Companion override for `request` migration above | Same as #3 | **Keep** |
| 5 | `form-data` | `2.5.5` | Pin transitive dep from `@cypress/request` chain | None (2.5.4 had incorrect dep, fixed in 2.5.5) | **Keep** |
| 6 | `minimatch` | `10.2.4` | ReDoS vulnerability in older minimatch versions | CVE-2022-3517 (ReDoS) | **Keep** |
| 7 | `qs` | `6.14.2` | Prototype pollution in older qs versions | CVE-2022-24999 (prototype pollution) | **Keep** |
| 8 | `node-domexception` | `npm:@nolyfill/domexception@^1.0.28` | Replace unmaintained polyfill with nolyfill shim | None (size/maintenance) | **Keep** |
| 9 | `@sinclair/typebox` | `0.34.48` | Pin exact version to avoid schema mismatches across workspace | None (compatibility) | **Keep** |
| 10 | `tar` | `7.5.9` | Path traversal vulnerabilities in older tar versions | CVE-2026-28453 (path traversal), older CVE-2021-32803/32804 | **Keep** |
| 11 | `tough-cookie` | `4.1.3` | Prototype pollution in older tough-cookie versions | CVE-2023-26136 (prototype pollution) | **Keep** |

## Detailed Analysis

### 1. hono -> 4.11.10

**Why it exists:** `@buape/carbon` (the Discord framework used by Donna) depends on
`hono` as a peer/transitive dependency. The override pins hono to `4.11.10` to ensure
a single resolved version across the dependency tree.

**History:** Commit `8fad4c284` message says "remove hono pinning", but the override
is still present in the current `package.json`. This suggests the override was
re-added or the commit only partially addressed it.

**Current state:** `@buape/carbon` is pinned to a specific beta version
(`0.0.0-beta-20260216184201`). The hono override ensures Carbon resolves a compatible
hono version. If Carbon is updated, the hono pin may need updating too.

**Recommendation:** **Monitor** -- may be removable if Carbon's hono peer dep range
already includes 4.11.10. Test by temporarily removing and running `pnpm install`.

---

### 2. fast-xml-parser -> 5.3.8

**Why it exists:** Bumped in commit `4bc466422` ("Deps: fix pnpm audit
vulnerabilities in Google extension path #33939"). Earlier version was bumped in
`942ed8927` ("deps: update overrides for minimatch and fast-xml-parser #20832").

**Vulnerability:** `fast-xml-parser` versions below certain thresholds had prototype
pollution and entity expansion vulnerabilities. Transitive dep pulled in by extensions
(Google Chat and others) that parse XML.

**Current state:** Version 5.3.8 is the latest at time of writing. The override forces
all transitive copies to use the patched version.

**Recommendation:** **Keep** -- actively addresses audit findings; multiple
extensions pull in older versions transitively.

---

### 3. request -> npm:@cypress/request@3.0.10

**Why it exists:** The original `request` npm package is deprecated (since 2020) and
has known security advisories (SSRF, cookie handling). Commit `3904d7ca0` ("deps:
migrate request to @cypress/request #20836") replaced it with the Cypress-maintained
fork.

**Consumer:** `@vector-im/matrix-bot-sdk` (Matrix extension) depends on `request`
and `request-promise`. The override aliases these to `@cypress/request` which is
actively maintained.

**Recommendation:** **Keep** -- `matrix-bot-sdk` still depends on `request`; removing
this override would reintroduce the deprecated, vulnerable original package.

---

### 4. request-promise -> npm:@cypress/request-promise@5.0.0

**Why it exists:** Companion to override #3. `request-promise` wraps `request`; the
Cypress fork provides a matching `@cypress/request-promise` that works with
`@cypress/request`.

**Consumer:** Same as #3 (`@vector-im/matrix-bot-sdk`).

**Recommendation:** **Keep** -- must stay paired with override #3.

---

### 5. form-data -> 2.5.4

**Why it exists:** Likely pinned as a transitive dependency of the `request`/
`@cypress/request` chain. The lockfile shows `form-data@2.5.4` is pulled in by the
request ecosystem.

**Problem:** Version 2.5.4 is itself deprecated with the note "This version has an
incorrect dependency; please use v2.5.5". The override is actively pinning to a
known-bad version.

**Current state:** `form-data` 2.5.5 fixes the incorrect dependency. Modern
`form-data` is at 4.x, but the `@cypress/request` chain may require the 2.x range.

**Recommendation:** **Remove candidate** -- at minimum, bump to `2.5.5` which fixes
the incorrect dependency warning. If `@cypress/request@3.0.10` works with
`form-data@2.5.5` (likely, since it is a bugfix release), update the override.
Alternatively, remove the override entirely and let `@cypress/request` resolve its
own `form-data` version.

---

### 6. minimatch -> 10.2.4

**Why it exists:** Older versions of `minimatch` (< 3.0.5) are vulnerable to ReDoS
(CVE-2022-3517). Many packages in the ecosystem depend on old minimatch versions.
Commit `942ed8927` ("deps: update overrides for minimatch and fast-xml-parser
#20832") and `5b62d5603` ("fix: unblock CI minimatch audit") addressed this.

**Current state:** `minimatch@10.2.4` is a major version jump that forces all
transitive minimatch consumers to use the modern, safe version. The lockfile shows
7 references.

**Recommendation:** **Keep** -- prevents ReDoS via transitive dependencies. Removing
would reintroduce vulnerable versions.

---

### 7. qs -> 6.14.2

**Why it exists:** Older `qs` versions have prototype pollution vulnerabilities
(CVE-2022-24999). Commit `d9d321f94` ("chore(security): bump qs and golang.org/x/net")
addressed this. `qs` is a transitive dependency of Express and the request chain.

**Current state:** `qs@6.14.2` is current and patched. Express 5.x (which Donna uses)
should resolve a safe version on its own, but the override ensures all transitive
consumers also use the patched version.

**Recommendation:** **Keep** -- low risk, high value security override.

---

### 8. node-domexception -> npm:@nolyfill/domexception@^1.0.28

**Why it exists:** `node-domexception` is an unmaintained polyfill for the
`DOMException` class. `@nolyfill/domexception` is a lightweight no-op replacement
(since modern Node.js 18+ has `DOMException` natively). This override also appears
in `dependencies` as a direct alias.

**Current state:** This is a "nolyfill" pattern -- replacing unnecessary polyfills
with no-op stubs for Node 22+ where the API is native. Reduces bundle size and
removes an unmaintained dependency.

**Recommendation:** **Keep** -- clean pattern for removing dead polyfills. Both the
override and the direct dependency alias should stay in sync.

---

### 9. @sinclair/typebox -> 0.34.48

**Why it exists:** `@sinclair/typebox` is used directly by Donna (`dependencies`) and
by multiple extensions (`extensions/llm-task`, `extensions/lobster`,
`extensions/voice-call`, `extensions/zalouser`). The override ensures all workspace
packages resolve the same exact version to avoid schema/type mismatches at runtime.

**History:** Commit `315b0938e` ("fix(types): avoid typebox schema mismatch in
embedded runner") suggests version mismatches caused runtime issues.

**Note per CLAUDE.md:** "Any dependency with `pnpm.patchedDependencies` must use an
exact version (no `^`/`~`)." While typebox is not patched, the exact-version pattern
is applied here for the same dedup/compatibility reason.

**Recommendation:** **Keep** -- prevents schema mismatches across the monorepo.
When upgrading typebox, update both `dependencies` and `overrides` together.

---

### 10. tar -> 7.5.9

**Why it exists:** Older `tar` versions have path traversal vulnerabilities
(CVE-2021-32803, CVE-2021-32804, and CVE-2026-28453). Commit `3d466529c` ("security:
audit CVE-2026-28453 -- TAR path traversal") confirmed Donna's archive handling is
safe but the override ensures no transitive consumer uses an old vulnerable version.

**Current state:** `tar@7.5.9` is also a direct dependency. The override ensures
transitive consumers (build tools, etc.) also use the patched version. The lockfile
shows the deprecation notice from npm: "Old versions of tar are not supported."

**Recommendation:** **Keep** -- critical security override for path traversal
prevention.

---

### 11. tough-cookie -> 4.1.3

**Why it exists:** `tough-cookie` versions before 4.1.3 have a prototype pollution
vulnerability (CVE-2023-26136). It is a transitive dependency of the request/
`@cypress/request` chain used by `matrix-bot-sdk`.

**Current state:** `tough-cookie@4.1.3` is the patched version. The lockfile shows
9 references, confirming it is still in the dependency tree.

**Recommendation:** **Keep** -- security fix for prototype pollution, still needed by
the request chain.

---

## Related: Patches Directory

No `patches/` directory exists in the repository. All dependency fixes are handled
via overrides, not pnpm patches.

## Related: pnpm.patchedDependencies

No `patchedDependencies` section exists in `package.json`. The `CLAUDE.md` rule about
exact versions for patched dependencies does not currently apply but is good practice
for the overrides section as well.

## Action Items

| Priority | Action | Override |
|----------|--------|----------|
| ~~High~~ | ~~Bump `form-data` from `2.5.4` to `2.5.5`~~ DONE (applied) | #5 |
| Low | Test removing `hono` override (may be auto-resolved by Carbon peerDep) | #1 |
| None | All others should remain as-is | #2-4, #6-11 |

## Maintenance Notes

- When upgrading `@buape/carbon`, check if the `hono` override version needs updating.
- When upgrading `@sinclair/typebox`, update both `dependencies` and `overrides`.
- The `request`/`request-promise`/`form-data`/`tough-cookie` cluster (#3, #4, #5, #11)
  all exist because of `@vector-im/matrix-bot-sdk`. If that package ever drops
  `request` dependency, all four overrides can be removed.
- Run `pnpm audit` periodically to check if any override versions need bumping.

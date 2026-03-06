---
summary: "CLI reference for `donna doctor` (health checks + guided repairs)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
---

# `donna doctor`

Health checks + quick fixes for the gateway and channels.

Related:

- Troubleshooting: [Troubleshooting](/gateway/troubleshooting)
- Security audit: [Security](/gateway/security)

## Examples

```bash
donna doctor
donna doctor --repair
donna doctor --deep
```

Notes:

- Interactive prompts (like keychain/OAuth fixes) only run when stdin is a TTY and `--non-interactive` is **not** set. Headless runs (cron, Telegram, no terminal) will skip prompts.
- `--fix` (alias for `--repair`) writes a backup to `~/.donna/donna.json.bak` and drops unknown config keys, listing each removal.
- State integrity checks now detect orphan transcript files in the sessions directory and can archive them as `.deleted.<timestamp>` to reclaim space safely.
- Doctor includes a memory-search readiness check and can recommend `donna configure --section model` when embedding credentials are missing.
- If sandbox mode is enabled but Docker is unavailable, doctor reports a high-signal warning with remediation (`install Docker` or `donna config set agents.defaults.sandbox.mode off`).

## macOS: `launchctl` env overrides

If you previously ran `launchctl setenv DONNA_GATEWAY_TOKEN ...` (or `...PASSWORD`), that value overrides your config file and can cause persistent “unauthorized” errors.

```bash
launchctl getenv DONNA_GATEWAY_TOKEN
launchctl getenv DONNA_GATEWAY_PASSWORD

launchctl unsetenv DONNA_GATEWAY_TOKEN
launchctl unsetenv DONNA_GATEWAY_PASSWORD
```

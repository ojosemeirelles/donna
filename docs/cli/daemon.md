---
summary: "CLI reference for `donna daemon` (legacy alias for gateway service management)"
read_when:
  - You still use `donna daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `donna daemon`

Legacy alias for Gateway service management commands.

`donna daemon ...` maps to the same service control surface as `donna gateway ...` service commands.

## Usage

```bash
donna daemon status
donna daemon install
donna daemon start
donna daemon stop
donna daemon restart
donna daemon uninstall
```

## Subcommands

- `status`: show service install state and probe Gateway health
- `install`: install service (`launchd`/`systemd`/`schtasks`)
- `uninstall`: remove service
- `start`: start service
- `stop`: stop service
- `restart`: restart service

## Common options

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- lifecycle (`uninstall|start|stop|restart`): `--json`

## Prefer

Use [`donna gateway`](/cli/gateway) for current docs and examples.

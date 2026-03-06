---
summary: "CLI reference for `donna logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `donna logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
donna logs
donna logs --follow
donna logs --json
donna logs --limit 500
donna logs --local-time
donna logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.

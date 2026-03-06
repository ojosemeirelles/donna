---
summary: "CLI reference for `donna reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `donna reset`

Reset local config/state (keeps the CLI installed).

```bash
donna reset
donna reset --dry-run
donna reset --scope config+creds+sessions --yes --non-interactive
```

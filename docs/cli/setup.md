---
summary: "CLI reference for `donna setup` (initialize config + workspace)"
read_when:
  - You’re doing first-run setup without the full onboarding wizard
  - You want to set the default workspace path
title: "setup"
---

# `donna setup`

Initialize `~/.donna/donna.json` and the agent workspace.

Related:

- Getting started: [Getting started](/start/getting-started)
- Wizard: [Onboarding](/start/onboarding)

## Examples

```bash
donna setup
donna setup --workspace ~/.donna/workspace
```

To run the wizard via setup:

```bash
donna setup --wizard
```

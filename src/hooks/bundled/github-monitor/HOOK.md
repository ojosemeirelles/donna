---
name: github-monitor
description: "Monitor GitHub repos for PRs, issues, and CI status with Telegram alerts"
homepage: https://docs.donna.ai/automation/hooks#github-monitor
metadata:
  donna:
    emoji: "\U0001F419"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# GitHub Monitor Hook

Monitors GitHub repositories for open PRs, new issues, and CI status. Sends periodic updates and weekly reports to Telegram.

## What It Does

1. Periodically checks configured repos for open PRs and recent issues
2. Monitors CI/CD status and alerts on failures
3. Sends a weekly summary report on a configured day

## Configuration

Create `~/.donna/hooks/github-monitor/config.json`:

```json
{
  "enabled": true,
  "telegramChatId": "YOUR_CHAT_ID",
  "repos": ["owner/repo1", "owner/repo2"],
  "checkIntervalMinutes": 30,
  "weeklyReportDay": "MON",
  "alertOnCIFailure": true
}
```

Create `~/.donna/github-token.json`:

```json
{
  "token": "ghp_your_github_token"
}
```

## Disabling

```bash
donna hooks disable github-monitor
```

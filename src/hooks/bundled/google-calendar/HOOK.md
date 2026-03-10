---
name: google-calendar
description: "Google Calendar integration — daily summary, conflict detection, event queries"
homepage: https://docs.donna.ai/automation/hooks#google-calendar
metadata:
  {
    "donna":
      {
        "emoji": "📅",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Google Calendar

Integrates Google Calendar with Donna for daily agenda summaries and event queries.

## Features

- Daily summary at configurable time (default 08:00)
- Conflict detection for overlapping events
- Query events via Telegram commands
- Multi-calendar support

## How It Works

On gateway startup, this hook registers a cron job in `~/.donna/cron/jobs.json`.
The cron job triggers an agent turn at the configured time, which fetches events
from Google Calendar, detects conflicts, and sends the formatted summary to Telegram.

**Note:** The cron job activates on the next gateway restart after first registration.

## Configuration

Create `~/.donna/hooks/google-calendar/config.json`:

```json
{
  "enabled": true,
  "dailySummaryTime": "0 8 * * *",
  "telegramChatId": "YOUR_CHAT_ID",
  "calendarIds": ["primary"]
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable/disable the hook |
| `dailySummaryTime` | `"0 8 * * *"` | Cron expression for daily summary |
| `telegramChatId` | — | Telegram chat ID to receive summaries |
| `calendarIds` | `["primary"]` | Google Calendar IDs to query |

## Prerequisites

1. Google OAuth configured: `~/.donna/google-oauth.json`
2. Calendar API scope added to OAuth consent screen
3. Authorized: `npx tsx src/infra/google-auth.ts`

## Disabling

```bash
donna hooks disable google-calendar
```

Or set `"enabled": false` in the config file.

## Changing the Schedule

Edit `~/.donna/hooks/google-calendar/config.json`, remove the existing cron job,
and restart the gateway:

```bash
donna cron remove google-calendar-daily
donna gateway restart
```

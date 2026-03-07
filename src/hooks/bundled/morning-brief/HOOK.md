---
name: morning-brief
description: "Send a daily morning brief via Telegram with emails, calendar events, and top tasks"
homepage: https://docs.donna.ai/automation/hooks#morning-brief
metadata:
  {
    "donna":
      {
        "emoji": "☀️",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Morning Brief Hook

Automatically sends a daily morning summary via Telegram at 7:00 AM (configurable).

## What It Does

Every morning, the agent collects and formats:

1. **📧 Priority emails** — Top 5 unread emails from the last 24 hours
2. **📅 Today's calendar** — All events with prep notes for each meeting
3. **✅ Top tasks** — 3 most urgent pending tasks
4. **🎯 Focus of the day** — Single most important thing to do today

## How It Works

On gateway startup, this hook registers a cron job in `~/.donna/cron/jobs.json`.
The cron job triggers an agent turn at the configured time, which collects data
from available skills (email, calendar, tasks) and sends the formatted brief to Telegram.

**Note:** The cron job activates on the next gateway restart after first registration.

## Configuration

Create `~/.donna/hooks/morning-brief/config.json`:

```json
{
  "time": "0 7 * * *",
  "timezone": "America/Sao_Paulo",
  "language": "pt",
  "telegramChatId": "YOUR_CHAT_ID",
  "sources": {
    "email": true,
    "calendar": true,
    "tasks": true
  }
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `time` | `"0 7 * * *"` | Cron expression for schedule |
| `timezone` | System timezone | IANA timezone name |
| `language` | `"pt"` | Language for the brief (`pt`, `en`, etc.) |
| `telegramChatId` | — | Telegram chat ID to receive the brief |
| `sources.email` | `true` | Include email summary |
| `sources.calendar` | `true` | Include calendar events |
| `sources.tasks` | `true` | Include task list |

### Finding Your Telegram Chat ID

Send any message to your bot, then check:
```bash
donna cron list
```

Or ask the bot: "Qual é o meu chat ID?" / "What is my chat ID?"

## Required Skills

At least one of these should be installed for full functionality:

- **Email:** `himalaya` (IMAP/SMTP) or `gmail` hook
- **Calendar:** `goplaces` or Apple Calendar CLI
- **Tasks:** `apple-reminders`, `things-mac`, `notion`, or `trello`

The brief skips unavailable sources gracefully — if email is not configured,
it simply omits that section.

## Disabling

```bash
donna hooks disable morning-brief
```

Or via config:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "morning-brief": { "enabled": false }
      }
    }
  }
}
```

## Changing the Schedule

Edit `~/.donna/hooks/morning-brief/config.json` and restart the gateway:

```bash
# Run at 6:30 AM instead
{ "time": "30 6 * * *" }

# Run on weekdays only
{ "time": "0 7 * * 1-5" }
```

Then remove the existing cron job and restart so the hook re-registers it:

```bash
donna cron remove morning-brief-daily
donna gateway restart
```

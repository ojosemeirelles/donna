---
name: notion-sync
description: "Sync Notion databases and report task updates via Telegram"
homepage: https://docs.donna.ai/automation/hooks#notion-sync
metadata:
  {
    "donna":
      {
        "emoji": "\uD83D\uDCDD",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Notion Sync Hook

Periodically syncs Notion databases and reports task updates via Telegram.

## What It Does

On a configurable interval (default: 60 minutes), the hook queries your Notion databases and reports:

1. **Pending tasks** with status, priority, and due dates
2. **Recently changed tasks** since the last sync
3. **Morning brief integration** — pending task count for the daily summary

## How It Works

On gateway startup, this hook registers a cron job in `~/.donna/cron/jobs.json`.
The cron job triggers an agent turn at the configured interval, which queries Notion
and sends a formatted summary to Telegram.

**Note:** The cron job activates on the next gateway restart after first registration.

## Configuration

Create `~/.donna/hooks/notion-sync/config.json`:

```json
{
  "enabled": true,
  "syncIntervalMinutes": 60,
  "telegramChatId": "YOUR_CHAT_ID",
  "databaseIds": ["your-notion-database-id"]
}
```

### Notion Token

Create `~/.donna/notion-token.json`:

```json
{
  "token": "secret_your_notion_integration_token"
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable or disable the hook |
| `syncIntervalMinutes` | `60` | Sync interval in minutes |
| `telegramChatId` | — | Telegram chat ID to receive updates |
| `databaseIds` | `[]` | List of Notion database IDs to monitor |

## Required Setup

1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Share your databases with the integration
3. Copy the integration token to `~/.donna/notion-token.json`
4. Add your database IDs to the config

## Disabling

```bash
donna hooks disable notion-sync
```

Or set `"enabled": false` in `~/.donna/hooks/notion-sync/config.json`.

---
name: google-drive
description: "Monitor Google Drive for file changes and report via Telegram"
homepage: https://docs.donna.ai/automation/hooks#google-drive
metadata:
  {
    "donna":
      {
        "emoji": "\uD83D\uDCC2",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Google Drive Hook

Monitors Google Drive for recently modified files and reports changes via Telegram.

## What It Does

On a configurable interval (default: 30 minutes), the hook checks Google Drive and reports:

1. **Recently modified files** with names, owners, and timestamps
2. **File type detection** with visual emoji indicators
3. **Morning brief integration** — count of recently modified files

## How It Works

On gateway startup, this hook registers a cron job in `~/.donna/cron/jobs.json`.
The cron job triggers an agent turn at the configured interval, which queries the
Google Drive API and sends a formatted summary to Telegram.

Uses the same Google OAuth tokens as the Gmail hook (`~/.donna/google-tokens.json`).

**Note:** The cron job activates on the next gateway restart after first registration.

## Configuration

Create `~/.donna/hooks/google-drive/config.json`:

```json
{
  "enabled": true,
  "monitorIntervalMinutes": 30,
  "telegramChatId": "YOUR_CHAT_ID",
  "watchFolderIds": ["folder-id-1"]
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable or disable the hook |
| `monitorIntervalMinutes` | `30` | Check interval in minutes |
| `telegramChatId` | — | Telegram chat ID to receive updates |
| `watchFolderIds` | `[]` | Specific folder IDs to monitor (empty = all) |

## Required Setup

1. Set up Google OAuth via `donna auth google`
2. Ensure Drive API scope is included in your OAuth config
3. Tokens are shared with Gmail at `~/.donna/google-tokens.json`

## Disabling

```bash
donna hooks disable google-drive
```

Or set `"enabled": false` in `~/.donna/hooks/google-drive/config.json`.

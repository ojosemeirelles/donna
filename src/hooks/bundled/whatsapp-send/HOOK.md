---
name: whatsapp-send
description: "Send WhatsApp messages via Donna gateway with optional confirmation"
homepage: https://docs.donna.ai/automation/hooks#whatsapp-send
metadata:
  {
    "donna":
      {
        "emoji": "\uD83D\uDCF1",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# WhatsApp Send Hook

Enables sending WhatsApp messages through the Donna gateway with optional confirmation.

## What It Does

Provides an on-demand WhatsApp messaging capability:

1. **Send messages** via the Donna gateway API
2. **Confirmation flow** — optional Telegram confirmation before sending
3. **Message logging** — all sent messages are logged to `~/.donna/whatsapp-log.json`

This hook does **not** register any cron jobs — it is purely on-demand.

## How It Works

On gateway startup, this hook logs its availability. Messages are sent via
`POST http://localhost:{port}/api/send` to the Donna gateway, which routes them
through the configured WhatsApp channel.

When `requireConfirmation` is enabled, a confirmation prompt is sent to Telegram
before the WhatsApp message is dispatched.

## Configuration

Create `~/.donna/hooks/whatsapp-send/config.json`:

```json
{
  "enabled": true,
  "telegramChatId": "YOUR_CHAT_ID",
  "requireConfirmation": true,
  "gatewayPort": 18789
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable or disable the hook |
| `telegramChatId` | — | Telegram chat ID for confirmation prompts |
| `requireConfirmation` | `true` | Require Telegram confirmation before sending |
| `gatewayPort` | `18789` | Donna gateway port |

## Required Setup

1. WhatsApp channel must be configured in the Donna gateway
2. Gateway must be running on the configured port

## Disabling

```bash
donna hooks disable whatsapp-send
```

Or set `"enabled": false` in `~/.donna/hooks/whatsapp-send/config.json`.

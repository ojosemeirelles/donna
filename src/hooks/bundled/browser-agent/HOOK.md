---
name: browser-agent
description: "Browser automation agent — web browsing, shopping, form filling with safety guardrails"
homepage: https://docs.donna.ai/automation/hooks#browser-agent
metadata:
  {
    "donna":
      {
        "emoji": "🌐",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Browser Agent

On-demand browser automation with safety guardrails for purchases and form submissions.

## Features

- Web browsing and information extraction
- Shopping with price comparison across stores
- Form filling with confirmation prompts
- Budget limits for automated purchases
- Configurable confirmation requirements

## How It Works

On gateway startup, this hook checks if the browser automation service is reachable
and registers itself as available for the orchestrator. Unlike other hooks, it does
**not** create cron jobs — it operates on-demand when triggered by user requests.

## Configuration

Create `~/.donna/hooks/browser-agent/config.json`:

```json
{
  "enabled": true,
  "port": 18791,
  "telegramChatId": "YOUR_CHAT_ID",
  "requireConfirmation": true,
  "maxBudgetCents": 10000
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable/disable the hook |
| `port` | `18791` | Port for browser automation service |
| `telegramChatId` | — | Telegram chat ID for confirmations |
| `requireConfirmation` | `true` | Require confirmation for purchases/submissions |
| `maxBudgetCents` | `10000` | Maximum budget in cents (10000 = 100 EUR) |

## Safety Guardrails

When `requireConfirmation` is `true` (default), the agent will pause and ask
for explicit confirmation before:

- Purchases / checkout
- Form submissions
- Account registrations
- Bookings / reservations
- Cancellations / deletions

## Disabling

```bash
donna hooks disable browser-agent
```

Or set `"enabled": false` in the config file.

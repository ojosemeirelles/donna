---
name: stripe-monitor
description: "Stripe payment monitoring — high-value alerts, daily financial summaries, MRR tracking"
homepage: https://docs.donna.ai/automation/hooks#stripe-monitor
metadata:
  {
    "donna":
      {
        "emoji": "💳",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Stripe Monitor

Monitors Stripe payments and sends alerts for high-value charges and daily financial summaries.

## Features

- Real-time alerts for payments above configurable threshold
- Daily financial summary (revenue, balance, MRR)
- Active subscription MRR estimation
- Morning brief integration

## How It Works

On gateway startup, this hook registers two cron jobs in `~/.donna/cron/jobs.json`:

1. **Payment check** (every 15 min default) — alerts on high-value charges
2. **Daily summary** (9:00 AM default) — full financial overview

## Configuration

Create `~/.donna/hooks/stripe-monitor/config.json`:

```json
{
  "enabled": true,
  "alertThresholdCents": 5000,
  "checkIntervalMinutes": 15,
  "telegramChatId": "YOUR_CHAT_ID",
  "dailySummaryTime": "0 9 * * *"
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable/disable the hook |
| `alertThresholdCents` | `5000` | Alert threshold in cents (5000 = 50 EUR) |
| `checkIntervalMinutes` | `15` | How often to check for new payments |
| `telegramChatId` | — | Telegram chat ID for alerts |
| `dailySummaryTime` | `"0 9 * * *"` | Cron expression for daily summary |

## Prerequisites

1. Create `~/.donna/stripe-key.json`:

```json
{
  "secretKey": "sk_live_..."
}
```

2. Use a restricted Stripe API key with read-only access to Charges, Balance, and Subscriptions.

## Disabling

```bash
donna hooks disable stripe-monitor
```

Or set `"enabled": false` in the config file.

## Changing the Schedule

Edit the config, remove existing cron jobs, and restart:

```bash
donna cron remove stripe-check
donna cron remove stripe-daily
donna gateway restart
```

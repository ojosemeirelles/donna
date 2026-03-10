---
name: google-ads-monitor
description: "Monitor Google Ads campaigns with CPC alerts and weekly reports via Telegram"
homepage: https://docs.donna.ai/automation/hooks#google-ads-monitor
metadata:
  donna:
    emoji: "\U0001F4C8"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Google Ads Monitor Hook

Monitors Google Ads campaigns for CPC threshold alerts and sends weekly performance reports.

## What It Does

1. Periodically checks campaign CPC against a configurable threshold
2. Alerts via Telegram when any campaign exceeds the CPC limit
3. Sends a weekly summary report with spend, clicks, impressions, and conversions

## Configuration

Create `~/.donna/hooks/google-ads-monitor/config.json`:

```json
{
  "enabled": true,
  "customerId": "YOUR_CUSTOMER_ID",
  "developerToken": "YOUR_DEV_TOKEN",
  "telegramChatId": "YOUR_CHAT_ID",
  "cpcAlertCents": 200,
  "weeklyReportDay": "MON",
  "checkIntervalMinutes": 60
}
```

## Credentials

Create `~/.donna/google-ads-credentials.json`:

```json
{
  "developerToken": "YOUR_DEVELOPER_TOKEN",
  "customerId": "YOUR_CUSTOMER_ID"
}
```

## Prerequisites

- Google OAuth configured via `donna login --google`
- Google Ads API enabled
- Developer token approved

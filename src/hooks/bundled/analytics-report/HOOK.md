---
name: analytics-report
description: "Daily Google Analytics report with traffic drop alerts via Telegram"
homepage: https://docs.donna.ai/automation/hooks#analytics-report
metadata:
  donna:
    emoji: "\U0001F4CA"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Analytics Report Hook

Sends a daily Google Analytics (GA4) report via Telegram with traffic metrics,
top pages, and automatic alerts when traffic drops significantly.

## What It Does

1. Fetches GA4 metrics (sessions, page views, users, bounce rate, avg session duration)
2. Fetches top 10 pages by views
3. Compares today vs yesterday and alerts if traffic dropped above threshold
4. Delivers formatted report via Telegram

## Configuration

Create `~/.donna/hooks/analytics-report/config.json`:

```json
{
  "enabled": true,
  "propertyId": "YOUR_GA4_PROPERTY_ID",
  "telegramChatId": "YOUR_CHAT_ID",
  "dailyReportTime": "0 9 * * *",
  "alertDropPercent": 30
}
```

## Prerequisites

- Google OAuth configured via `donna login --google`
- GA4 property with Data API enabled

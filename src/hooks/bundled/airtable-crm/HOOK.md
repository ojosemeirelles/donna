---
name: airtable-crm
description: "Monitor Airtable CRM for stale leads and send follow-up alerts via Telegram"
homepage: https://docs.donna.ai/automation/hooks#airtable-crm
metadata:
  donna:
    emoji: "\U0001F5C2\uFE0F"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Airtable CRM Hook

Monitors an Airtable base as a lightweight CRM, alerting when leads go stale
and need follow-up.

## What It Does

1. Periodically reads leads from a configured Airtable base/table
2. Identifies leads not contacted within the stale threshold (default: 3 days)
3. Sends stale lead alerts via Telegram

## Configuration

Create `~/.donna/hooks/airtable-crm/config.json`:

```json
{
  "enabled": true,
  "baseId": "appXXXXXXXXXX",
  "tableId": "tblXXXXXXXXXX",
  "telegramChatId": "YOUR_CHAT_ID",
  "staleDays": 3,
  "checkIntervalMinutes": 60
}
```

## Credentials

Create `~/.donna/airtable-token.json`:

```json
{
  "token": "YOUR_AIRTABLE_PAT"
}
```

## Expected Table Fields

| Field | Type | Description |
|-------|------|-------------|
| Name | Text | Lead name |
| Email | Email | Contact email |
| Company | Text | Company name |
| Status | Select | Pipeline status |
| LastContactDate | Date | Last contact date |
| CreatedAt | Date | Record creation date |

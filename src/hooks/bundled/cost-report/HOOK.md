---
name: cost-report
description: "Send a daily cost breakdown via Telegram at 8PM with model usage, cache stats, and top operations"
metadata:
  donna:
    emoji: "💰"
    events: ["gateway:startup"]
    install:
      - id: bundled
        kind: bundled
        label: "Bundled with Donna"
---

# Cost Report Hook

Registers a daily cron job that generates a cost breakdown report and delivers it via Telegram (or another configured channel) at 20:00 local time.

## What it reports

- Total daily cost and token usage
- Per-model breakdown (haiku / sonnet / opus)
- Cache hit rate and estimated savings
- Day-over-day cost variation

## Configuration

Set in `~/.donna/donna.json` under `hooks.costReport`:

```json
{
  "hooks": {
    "costReport": {
      "time": "0 20 * * *",
      "timezone": "America/Sao_Paulo",
      "language": "pt",
      "telegramChatId": "123456789"
    }
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `time` | `"0 20 * * *"` | Cron expression for report delivery |
| `timezone` | system timezone | IANA timezone string |
| `language` | `"pt"` | Report language (`"pt"` or `"en"`) |
| `telegramChatId` | — | Telegram chat ID for delivery (required for delivery) |

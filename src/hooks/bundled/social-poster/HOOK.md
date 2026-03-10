---
name: social-poster
description: "Schedule and publish social media posts to Instagram, LinkedIn, and Twitter via Telegram"
homepage: https://docs.donna.ai/automation/hooks#social-poster
metadata:
  donna:
    emoji: "\U0001F4E3"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Social Poster Hook

Schedule and publish social media posts across Instagram, LinkedIn, and Twitter.

## What It Does

Periodically checks `~/.donna/social-schedule.json` for pending posts that are due
and attempts to publish them to the specified platform. Results are reported via Telegram.

## Configuration

Create `~/.donna/hooks/social-poster/config.json`:

```json
{
  "enabled": true,
  "telegramChatId": "YOUR_CHAT_ID",
  "checkIntervalMinutes": 5
}
```

## Schedule Format

Posts are stored in `~/.donna/social-schedule.json`:

```json
{
  "posts": [
    {
      "id": "post-123",
      "platform": "linkedin",
      "content": "Exciting update!",
      "scheduledAt": 1710000000000,
      "status": "pending",
      "createdAt": 1709900000000
    }
  ]
}
```

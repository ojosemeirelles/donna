---
name: slack-bridge
description: "Bridge Slack channels to Telegram with urgent message alerts and periodic digests"
homepage: https://docs.donna.ai/automation/hooks#slack-bridge
metadata:
  donna:
    emoji: "\U0001F4AC"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Slack Bridge Hook

Bridges Slack channels to Telegram by periodically checking for new messages and forwarding digests or urgent alerts.

## What It Does

1. Periodically fetches messages from configured Slack channels
2. Classifies messages by urgency using keyword detection
3. Sends urgent messages immediately as Telegram alerts
4. Sends periodic digests grouped by channel

## Configuration

Create `~/.donna/hooks/slack-bridge/config.json`:

```json
{
  "enabled": true,
  "telegramChatId": "YOUR_CHAT_ID",
  "checkIntervalMinutes": 10,
  "watchChannels": ["C01ABCDEF", "C02GHIJKL"],
  "urgentKeywords": ["urgente", "urgent", "asap", "@here", "@channel"]
}
```

Create `~/.donna/slack-token.json`:

```json
{
  "botToken": "xoxb-your-bot-token",
  "userToken": "xoxp-your-user-token"
}
```

## Disabling

```bash
donna hooks disable slack-bridge
```

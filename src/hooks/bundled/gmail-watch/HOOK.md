---
name: gmail-watch
description: "Watch Gmail for new messages, classify urgency, and alert via Telegram"
homepage: https://docs.donna.ai/automation/hooks#gmail-watch
metadata:
  donna:
    emoji: "📧"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Gmail Watch

Monitors Gmail for new unread emails and classifies them:
- **URGENT**: VIP senders, urgent keywords, awaited replies
- **ACTION**: Requires response but not time-sensitive
- **WAIT**: Newsletters, notifications, marketing

Urgent emails trigger immediate Telegram alerts. Action emails are batched into periodic digests.

## Configuration

Edit `~/.donna/hooks/gmail-watch/config.json`:

```json
{
  "enabled": true,
  "checkIntervalMinutes": 5,
  "vipSenders": ["boss@company.com"],
  "urgentKeywords": ["urgente", "urgent", "asap", "deadline"],
  "telegramChatId": "YOUR_CHAT_ID",
  "actionDigestIntervalMinutes": 120
}
```

## Prerequisites

1. Google OAuth configured: `~/.donna/google-oauth.json`
2. Authorized: `npx tsx src/infra/google-auth.ts`
3. Tokens saved: `~/.donna/google-tokens.json`

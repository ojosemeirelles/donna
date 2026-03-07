---
name: memory-consolidation
description: "Weekly memory consolidation — prunes old episodes, generates summaries, and delivers an insights report via Telegram every Sunday"
homepage: https://docs.donna.ai/automation/hooks#memory-consolidation
metadata:
  {
    "donna":
      {
        "emoji": "🧠",
        "events": ["gateway:startup"],
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with Donna" }],
      },
  }
---

# Memory Consolidation Hook

Runs every Sunday at 21:00 (configurable) to consolidate Donna's 3-layer memory system
and optionally deliver a weekly insights report via Telegram.

## What It Does

1. **Consolidates episodes** — generates summaries for the last 7 days of raw episode logs
2. **Analyzes patterns** — reviews tool usage and active hours for the week
3. **Prunes old data** — removes raw episodes older than `retentionDays` (default: 30)
4. **Delivers a report** (if `telegramChatId` is set) with:
   - 🧠 Week summary
   - 🔧 Most used tools
   - ⏰ Peak productivity hours
   - 🎯 Behavioral insights

## Prerequisites

Enable the Donna memory system in `~/.donna/donna.json`:

```json
{
  "memory": {
    "enabled": true,
    "identity": { "enabled": true },
    "patterns": { "enabled": true, "retentionDays": 28, "analyzeOnSunday": true },
    "episodic": { "enabled": true, "retentionDays": 30, "summaryRetentionDays": 365 }
  }
}
```

## Hook Configuration

Create `~/.donna/hooks/memory-consolidation.json`:

```json
{
  "time": "0 21 * * 0",
  "timezone": "America/Sao_Paulo",
  "language": "pt",
  "telegramChatId": "YOUR_CHAT_ID"
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `time` | `"0 21 * * 0"` | Cron expression (default: Sunday 21:00) |
| `timezone` | System timezone | IANA timezone name |
| `language` | `"pt"` | Language for the report (`pt` or `en`) |
| `telegramChatId` | — | Telegram chat ID to receive the report |

## Memory Files

All memory data is stored in `~/.donna/memory/` (outside the repo — never committed):

```
~/.donna/memory/
├── identity.json          — user identity and preferences
├── patterns.json          — behavioral pattern events and analysis
└── episodes/
    ├── 2026-03-07.json    — daily raw episode entries
    └── summaries/
        └── 2026-03-07.json — episode summaries (retained longer)
```

## Disabling

```bash
donna hooks disable memory-consolidation
```

---
name: home-assistant
description: "Control and monitor Home Assistant devices with natural language commands via Telegram"
homepage: https://docs.donna.ai/automation/hooks#home-assistant
metadata:
  donna:
    emoji: "\U0001F3E0"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Home Assistant Hook

Integrates with Home Assistant to monitor and control smart home devices. Supports natural language commands and entity status reporting.

## What It Does

1. Connects to your Home Assistant instance on gateway startup
2. Monitors configured entities (lights, climate, sensors, etc.)
3. Parses natural language commands to control devices
4. Provides home status in the morning brief

## Configuration

Create `~/.donna/hooks/home-assistant/config.json` or `~/.donna/ha-config.json`:

```json
{
  "enabled": true,
  "url": "http://homeassistant.local:8123",
  "telegramChatId": "YOUR_CHAT_ID",
  "monitorEntities": [
    "climate.living_room",
    "light.bedroom",
    "sensor.temperature"
  ],
  "automations": [
    { "trigger": "sunset", "action": "turn on living room lights" }
  ]
}
```

Create `~/.donna/ha-config.json` (also serves as token source):

```json
{
  "url": "http://homeassistant.local:8123",
  "token": "your_long_lived_access_token"
}
```

### Supported Commands

- "apaga luzes" / "turn off lights"
- "liga ar" / "turn on AC"
- "temperatura" / "temperature"

## Disabling

```bash
donna hooks disable home-assistant
```

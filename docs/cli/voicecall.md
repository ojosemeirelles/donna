---
summary: "CLI reference for `donna voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `donna voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
donna voicecall status --call-id <id>
donna voicecall call --to "+15555550123" --message "Hello" --mode notify
donna voicecall continue --call-id <id> --message "Any questions?"
donna voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
donna voicecall expose --mode serve
donna voicecall expose --mode funnel
donna voicecall expose --mode off
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.

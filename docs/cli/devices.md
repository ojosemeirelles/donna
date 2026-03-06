---
summary: "CLI reference for `donna devices` (device pairing + token rotation/revocation)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "devices"
---

# `donna devices`

Manage device pairing requests and device-scoped tokens.

## Commands

### `donna devices list`

List pending pairing requests and paired devices.

```
donna devices list
donna devices list --json
```

### `donna devices remove <deviceId>`

Remove one paired device entry.

```
donna devices remove <deviceId>
donna devices remove <deviceId> --json
```

### `donna devices clear --yes [--pending]`

Clear paired devices in bulk.

```
donna devices clear --yes
donna devices clear --yes --pending
donna devices clear --yes --pending --json
```

### `donna devices approve [requestId] [--latest]`

Approve a pending device pairing request. If `requestId` is omitted, Donna
automatically approves the most recent pending request.

```
donna devices approve
donna devices approve <requestId>
donna devices approve --latest
```

### `donna devices reject <requestId>`

Reject a pending device pairing request.

```
donna devices reject <requestId>
```

### `donna devices rotate --device <id> --role <role> [--scope <scope...>]`

Rotate a device token for a specific role (optionally updating scopes).

```
donna devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `donna devices revoke --device <id> --role <role>`

Revoke a device token for a specific role.

```
donna devices revoke --device <deviceId> --role node
```

## Common options

- `--url <url>`: Gateway WebSocket URL (defaults to `gateway.remote.url` when configured).
- `--token <token>`: Gateway token (if required).
- `--password <password>`: Gateway password (password auth).
- `--timeout <ms>`: RPC timeout.
- `--json`: JSON output (recommended for scripting).

Note: when you set `--url`, the CLI does not fall back to config or environment credentials.
Pass `--token` or `--password` explicitly. Missing explicit credentials is an error.

## Notes

- Token rotation returns a new token (sensitive). Treat it like a secret.
- These commands require `operator.pairing` (or `operator.admin`) scope.
- `devices clear` is intentionally gated by `--yes`.
- If pairing scope is unavailable on local loopback (and no explicit `--url` is passed), list/approve can use a local pairing fallback.

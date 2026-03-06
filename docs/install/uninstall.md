---
summary: "Uninstall Donna completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Donna from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `donna` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
donna uninstall
```

Non-interactive (automation / npx):

```bash
donna uninstall --all --yes --non-interactive
npx -y donna uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
donna gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
donna gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${DONNA_STATE_DIR:-$HOME/.donna}"
```

If you set `DONNA_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.donna/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g donna
pnpm remove -g donna
bun remove -g donna
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Donna.app
```

Notes:

- If you used profiles (`--profile` / `DONNA_PROFILE`), repeat step 3 for each state dir (defaults are `~/.donna-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `donna` is missing.

### macOS (launchd)

Default label is `ai.donna.gateway` (or `ai.donna.<profile>`; legacy `com.donna.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.donna.gateway
rm -f ~/Library/LaunchAgents/ai.donna.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.donna.<profile>`. Remove any legacy `com.donna.*` plists if present.

### Linux (systemd user unit)

Default unit name is `donna-gateway.service` (or `donna-gateway-<profile>.service`):

```bash
systemctl --user disable --now donna-gateway.service
rm -f ~/.config/systemd/user/donna-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Donna Gateway` (or `Donna Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Donna Gateway"
Remove-Item -Force "$env:USERPROFILE\.donna\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.donna-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://donna.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g donna@latest`.
Remove it with `npm rm -g donna` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `donna ...` / `bun run donna ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.

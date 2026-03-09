# Ralph — Loop Automation Tool

Ralph is a simple loop automation tool for Donna development.

## Usage

```bash
# Run once
./scripts/ralph/ralph.sh --once

# Run every 5 minutes (default)
./scripts/ralph/ralph.sh

# Custom interval (60 seconds)
./scripts/ralph/ralph.sh --interval 60
```

## Files

- `ralph.sh` — Main script (lint, typecheck, tests)
- `prd.json` — Task tracking with 4 user stories
- `ralph.log` — Execution log (gitignored)

## PRD Stories

| ID | Title | Status |
|----|-------|--------|
| DONNA-001 | Rebranding OpenClaw → Donna | done |
| DONNA-002 | Shadow Army System | done |
| DONNA-003 | Electron Desktop App Fixes | done |
| DONNA-004 | Shadow Sessions — Real Agent Delegation | backlog |

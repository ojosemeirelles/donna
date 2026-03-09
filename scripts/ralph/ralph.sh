#!/usr/bin/env bash
# Ralph — Loop automation for Donna development tasks
# Usage: ./ralph.sh [--interval SECONDS] [--story STORY_ID] [--once]
#
# Reads prd.json for task definitions and executes them in order.
# Each task runs tests, checks types, and reports status.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
LOG_FILE="$SCRIPT_DIR/ralph.log"
INTERVAL="${RALPH_INTERVAL:-300}"
RUN_ONCE=false

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --interval) INTERVAL="$2"; shift 2 ;;
    --once) RUN_ONCE=true; shift ;;
    --story) STORY_FILTER="$2"; shift 2 ;;
    --help|-h)
      echo "Ralph — Loop automation for Donna"
      echo ""
      echo "Usage: ./ralph.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --interval N   Seconds between runs (default: 300)"
      echo "  --once          Run once and exit"
      echo "  --story ID      Filter to specific story"
      echo "  --help          Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

check_prd() {
  if [[ ! -f "$PRD_FILE" ]]; then
    log "ERROR: prd.json not found at $PRD_FILE"
    exit 1
  fi
}

run_checks() {
  log "=== Ralph run starting ==="
  cd "$PROJECT_ROOT"

  # 1. Lint check
  log "Running lint..."
  if pnpm check 2>&1 | tail -5; then
    log "Lint: PASS"
  else
    log "Lint: ISSUES FOUND (non-blocking)"
  fi

  # 2. Type check
  log "Running typecheck..."
  if pnpm tsgo 2>&1 | tail -5; then
    log "Typecheck: PASS"
  else
    log "Typecheck: ISSUES FOUND (non-blocking)"
  fi

  # 3. Tests
  log "Running tests..."
  if pnpm test --run 2>&1 | tail -10; then
    log "Tests: PASS"
  else
    log "Tests: SOME FAILURES"
  fi

  # 4. Shadow Army specific tests
  log "Running shadow tests..."
  if pnpm test --run src/shadows/ 2>&1 | tail -5; then
    log "Shadow tests: PASS"
  else
    log "Shadow tests: FAILURES"
  fi

  log "=== Ralph run complete ==="
}

# Main
check_prd
log "Ralph started (interval: ${INTERVAL}s, once: $RUN_ONCE)"

if $RUN_ONCE; then
  run_checks
else
  while true; do
    run_checks
    log "Sleeping ${INTERVAL}s..."
    sleep "$INTERVAL"
  done
fi

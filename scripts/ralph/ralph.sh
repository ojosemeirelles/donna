#!/usr/bin/env bash
# Ralph — Loop automation for Donna development tasks
# Usage: ./ralph.sh [OPTIONS] [COUNT]
#
# Modes:
#   (default)         Run lint/typecheck/tests loop
#   --tool claude N   Delegate N pending tasks from prd.json to Claude Code CLI
#
# Reads prd.json for task definitions and executes them in order.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
LOG_FILE="$SCRIPT_DIR/ralph.log"
INTERVAL="${RALPH_INTERVAL:-300}"
RUN_ONCE=false
TOOL=""
TASK_COUNT=0

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --interval) INTERVAL="$2"; shift 2 ;;
    --once) RUN_ONCE=true; shift ;;
    --story) STORY_FILTER="$2"; shift 2 ;;
    --tool)
      TOOL="$2"
      TASK_COUNT="${3:-5}"
      shift 2
      # Consume count if it's a number
      if [[ $# -gt 0 && "$1" =~ ^[0-9]+$ ]]; then
        TASK_COUNT="$1"
        shift
      fi
      ;;
    --help|-h)
      echo "Ralph — Loop automation for Donna"
      echo ""
      echo "Usage: ./ralph.sh [OPTIONS] [COUNT]"
      echo ""
      echo "Options:"
      echo "  --interval N     Seconds between runs (default: 300)"
      echo "  --once           Run once and exit"
      echo "  --story ID       Filter to specific story"
      echo "  --tool TOOL N    Delegate N pending tasks to TOOL (claude)"
      echo "  --help           Show this help"
      echo ""
      echo "Examples:"
      echo "  ./ralph.sh --once                    # Run checks once"
      echo "  ./ralph.sh --tool claude 5           # Delegate 5 tasks to Claude"
      echo "  ./ralph.sh --tool claude 3 --story DONNA-004  # 3 tasks from story"
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

# Extract pending tasks from prd.json using node (jq alternative)
get_pending_tasks() {
  local filter="${STORY_FILTER:-}"
  node -e "
    const prd = require('$PRD_FILE');
    const tasks = [];
    for (const story of prd.stories) {
      if ('$filter' && story.id !== '$filter') continue;
      if (story.status === 'done') continue;
      for (const task of story.tasks) {
        if (task.status === 'pending') {
          tasks.push({ storyId: story.id, storyTitle: story.title, taskId: task.id, taskTitle: task.title });
        }
      }
    }
    console.log(JSON.stringify(tasks));
  "
}

# Mark a task as in_progress or done in prd.json
update_task_status() {
  local story_id="$1"
  local task_id="$2"
  local new_status="$3"
  node -e "
    const fs = require('fs');
    const prd = JSON.parse(fs.readFileSync('$PRD_FILE', 'utf-8'));
    for (const story of prd.stories) {
      if (story.id !== '$story_id') continue;
      for (const task of story.tasks) {
        if (task.id !== '$task_id') continue;
        task.status = '$new_status';
      }
      // Check if all tasks done
      if (story.tasks.every(t => t.status === 'done')) story.status = 'done';
    }
    fs.writeFileSync('$PRD_FILE', JSON.stringify(prd, null, 2) + '\n');
  "
}

run_claude_tasks() {
  local count="$1"
  local pending
  pending=$(get_pending_tasks)
  local total
  total=$(node -e "console.log(JSON.parse('$pending').length)")

  if [[ "$total" -eq 0 ]]; then
    log "No pending tasks found in prd.json"
    return 0
  fi

  local to_run=$((count < total ? count : total))
  log "=== Ralph + Claude: $to_run of $total pending tasks ==="

  for i in $(seq 0 $((to_run - 1))); do
    local task_json
    task_json=$(node -e "const t=JSON.parse('$pending')[$i]; console.log(JSON.stringify(t))")
    local story_id task_id task_title story_title
    story_id=$(node -e "console.log(JSON.parse('$task_json').storyId)")
    task_id=$(node -e "console.log(JSON.parse('$task_json').taskId)")
    task_title=$(node -e "console.log(JSON.parse('$task_json').taskTitle)")
    story_title=$(node -e "console.log(JSON.parse('$task_json').storyTitle)")

    log "[$((i+1))/$to_run] $story_id/$task_id: $task_title"

    # Build prompt for Claude
    local prompt="You are working on the Donna project at $PROJECT_ROOT.
Story: $story_id — $story_title
Task: $task_id — $task_title

Execute this task. When done, report what you did."

    log "  Delegating to Claude Code..."
    update_task_status "$story_id" "$task_id" "in_progress"
    if env -u CLAUDECODE claude --dangerously-skip-permissions -p "$prompt" --output-format text 2>&1 | tee -a "$LOG_FILE" | tail -20; then
      update_task_status "$story_id" "$task_id" "done"
      log "  Task $task_id: DONE"
    else
      update_task_status "$story_id" "$task_id" "pending"
      log "  Task $task_id: FAILED — reverted to pending"
    fi

    echo ""
  done

  log "=== Ralph + Claude: complete ==="
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

if [[ "$TOOL" == "claude" ]]; then
  log "Ralph started (tool: claude, tasks: $TASK_COUNT)"
  run_claude_tasks "$TASK_COUNT"
elif [[ -n "$TOOL" ]]; then
  log "ERROR: Unknown tool '$TOOL'. Supported: claude"
  exit 1
else
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
fi

#!/usr/bin/env bash
set -euo pipefail

cd /repo

export DONNA_STATE_DIR="/tmp/donna-test"
export DONNA_CONFIG_PATH="${DONNA_STATE_DIR}/donna.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${DONNA_STATE_DIR}/credentials"
mkdir -p "${DONNA_STATE_DIR}/agents/main/sessions"
echo '{}' >"${DONNA_CONFIG_PATH}"
echo 'creds' >"${DONNA_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${DONNA_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm donna reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${DONNA_CONFIG_PATH}"
test ! -d "${DONNA_STATE_DIR}/credentials"
test ! -d "${DONNA_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${DONNA_STATE_DIR}/credentials"
echo '{}' >"${DONNA_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm donna uninstall --state --yes --non-interactive

test ! -d "${DONNA_STATE_DIR}"

echo "OK"

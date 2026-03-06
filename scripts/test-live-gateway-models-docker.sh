#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${DONNA_IMAGE:-${DONNA_IMAGE:-donna:local}}"
CONFIG_DIR="${DONNA_CONFIG_DIR:-${DONNA_CONFIG_DIR:-$HOME/.donna}}"
WORKSPACE_DIR="${DONNA_WORKSPACE_DIR:-${DONNA_WORKSPACE_DIR:-$HOME/.donna/workspace}}"
PROFILE_FILE="${DONNA_PROFILE_FILE:-${DONNA_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run gateway live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e DONNA_LIVE_TEST=1 \
  -e DONNA_LIVE_GATEWAY_MODELS="${DONNA_LIVE_GATEWAY_MODELS:-${DONNA_LIVE_GATEWAY_MODELS:-modern}}" \
  -e DONNA_LIVE_GATEWAY_PROVIDERS="${DONNA_LIVE_GATEWAY_PROVIDERS:-${DONNA_LIVE_GATEWAY_PROVIDERS:-}}" \
  -e DONNA_LIVE_GATEWAY_MAX_MODELS="${DONNA_LIVE_GATEWAY_MAX_MODELS:-${DONNA_LIVE_GATEWAY_MAX_MODELS:-24}}" \
  -e DONNA_LIVE_GATEWAY_MODEL_TIMEOUT_MS="${DONNA_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-${DONNA_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-}}" \
  -v "$CONFIG_DIR":/home/node/.donna \
  -v "$WORKSPACE_DIR":/home/node/.donna/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"

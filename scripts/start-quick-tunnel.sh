#!/bin/zsh
set -euo pipefail
cd /Users/nia_santos/Projects/nia-voice-realtime
mkdir -p .runtime
exec /opt/homebrew/bin/cloudflared tunnel --no-autoupdate --loglevel info --url http://localhost:3000 2>&1 | tee .runtime/tunnel.log

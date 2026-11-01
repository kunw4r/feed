#!/bin/bash
# Build + publish a Brainfeed edition from the VPS (Claude Code CLI, subscription auth).
# Cron: 23 19,1,7 * * * UTC. Pushing frontend/public/data triggers the Pages deploy workflow.
set -euo pipefail
cd /opt/brainfeed
export PATH="/usr/local/bin:/usr/bin:$PATH"
unset ANTHROPIC_API_KEY
git pull --rebase -q
python3 scripts/build_feed.py --incremental --excerpt 3
git add frontend/public/data/today.json frontend/public/data/articles frontend/public/data/archive
git diff --cached --quiet && { echo "No changes"; exit 0; }
git commit -q -m "chore(feed): update edition $(TZ=Australia/Brisbane date '+%Y-%m-%d %H:%M')"
git pull --rebase -q && git push -q

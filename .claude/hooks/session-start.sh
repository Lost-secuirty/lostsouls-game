#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web.
# Installs deps so the dev server, build, linter, and tests work out of the
# box in a fresh remote container. Only runs in remote (web) sessions; local
# machines already have their setup.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Activate the pre-commit secret/PII gate (idempotent; see .githooks/pre-commit).
git config core.hooksPath .githooks 2>/dev/null || true

# `npm install` (not `ci`) so cached container state is reused and partial
# installs self-heal. Idempotent.
npm install

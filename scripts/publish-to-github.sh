#!/usr/bin/env bash
# Initialize (if needed), commit, and push CELPIP Lib to GitHub.
# Usage:
#   ./scripts/publish-to-github.sh
#   ./scripts/publish-to-github.sh your-github-username/celpip-platform
#   GITHUB_REPO=your-github-username/celpip-platform ./scripts/publish-to-github.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_SLUG="${1:-${GITHUB_REPO:-}}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
COMMIT_MSG="${COMMIT_MSG:-Sync CELPIP Lib: practice platform, mock tests, and Task 3/4 image pipeline.}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed." >&2
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "Initializing git repository..."
  git init -b "$DEFAULT_BRANCH"
fi

if [[ -f .env.local ]] || [[ -f .env ]]; then
  echo "Note: .env files are gitignored (only .env.example is committed)."
fi

git add -A
git status --short

if git diff --cached --quiet; then
  echo "Nothing to commit — working tree clean."
else
  git commit -m "$COMMIT_MSG"
fi

if [[ -z "$REPO_SLUG" ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote origin already set: $(git remote get-url origin)"
  else
    echo "No GitHub remote configured." >&2
    echo "Create a repo on GitHub, then run:" >&2
    echo "  git remote add origin git@github.com:YOUR_USER/celpip-platform.git" >&2
    echo "  git push -u origin $DEFAULT_BRANCH" >&2
    echo "" >&2
    echo "Or re-run with: ./scripts/publish-to-github.sh YOUR_USER/celpip-platform" >&2
    exit 1
  fi
else
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "https://github.com/${REPO_SLUG}.git"
  else
    git remote add origin "https://github.com/${REPO_SLUG}.git"
  fi

  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if ! gh repo view "$REPO_SLUG" >/dev/null 2>&1; then
      echo "Creating GitHub repo $REPO_SLUG ..."
      gh repo create "$REPO_SLUG" --source=. --public --remote=origin --push
      echo "Done: https://github.com/${REPO_SLUG}"
      exit 0
    fi
  fi
fi

echo "Pushing to origin ($DEFAULT_BRANCH)..."
git push -u origin "$DEFAULT_BRANCH"
echo "Done."

#!/usr/bin/env bash
# One-command deploy from Termux:  bash termux-deploy.sh
# Installs tools, logs in to GitHub (browser), enables Pages, sets the backend URL, pushes this project.
set -euo pipefail

OWNER="Nikhil-creat"
REPO="resume-reviewer-pro"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$HOME/rrp-repo"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }

say "1/6 Installing git, GitHub CLI, tar"
pkg install -y git gh tar >/dev/null 2>&1 || pkg install -y git gh tar

say "2/6 Git identity"
NAME="$(git config --global user.name || true)"
EMAIL="$(git config --global user.email || true)"
[ -z "$NAME" ] && NAME="Nikhil Chary Sriramoju"
if [ -z "$EMAIL" ] || [[ "$EMAIL" == *YOUR_* ]]; then
  read -r -p "Your GitHub email: " EMAIL
fi
[ -z "$EMAIL" ] && { echo "An email is required for commits."; exit 1; }
git config --global user.name "$NAME"
git config --global user.email "$EMAIL"
echo "Using: $NAME <$EMAIL>"

say "3/6 GitHub login"
if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Pick: GitHub.com -> HTTPS -> Yes -> Login with a web browser"
  echo "Copy the one-time code, open github.com/login/device, paste it, approve."
  gh auth login -h github.com -p https -w
fi
gh auth setup-git
gh auth status -h github.com || true

say "4/6 Pages + backend URL"
read -r -p "Paste your Vercel backend URL (or press Enter to skip for now): " API
API="${API%/}"
if [ -n "$API" ]; then
  gh variable set API_BASE --body "$API" -R "$OWNER/$REPO" && echo "API_BASE set to $API" || warn "Could not set API_BASE; add it manually in repo Settings > Variables."
fi
if gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
   || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1; then
  echo "Pages source set to GitHub Actions"
else
  warn "Could not set the Pages source. Do it by hand: repo Settings > Pages > Source: GitHub Actions"
fi

say "5/6 Copying project into the repo"
rm -rf "$WORK"
gh repo clone "$OWNER/$REPO" "$WORK"
cd "$WORK"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
(cd "$SRC" && tar --exclude=.git --exclude=node_modules -cf - .) | tar -xf - -C "$WORK"
git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q -m "v2: agentic AI, RAG, CNN, Docker, Pages workflow"
fi

say "6/6 Pushing"
if ! git push origin HEAD; then
  warn "Push failed. If it mentions 'workflow' scope, run:  gh auth refresh -h github.com -s workflow  then re-run this script."
  exit 1
fi
gh workflow run pages.yml -R "$OWNER/$REPO" >/dev/null 2>&1 || true

say "Done"
echo "Repo   : https://github.com/$OWNER/$REPO"
echo "Actions: https://github.com/$OWNER/$REPO/actions   (wait for the green tick)"
echo "Site   : https://${OWNER,,}.github.io/$REPO/"
[ -z "$API" ] && warn "No backend URL yet: deploy on Vercel, then run:  gh variable set API_BASE --body https://YOUR.vercel.app -R $OWNER/$REPO  and  gh workflow run pages.yml -R $OWNER/$REPO"

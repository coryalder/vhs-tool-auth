#!/usr/bin/env bash
# crontab:
# */5 * * * * /path/to/check_update.sh >> /var/log/update_check.log 2>&1

git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "New update detected: $REMOTE"
  git reset --hard origin/main
  # reset the service
fi
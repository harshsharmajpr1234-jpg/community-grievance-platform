#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Production backup: PostgreSQL dump + uploaded complaint files.
# Usage:  DATABASE_URL=... UPLOAD_DIR=./storage/uploads ./scripts/backup.sh [dest-dir]
# Restore: see docs/BACKUP.md
# Schedule daily via cron: 0 2 * * * /path/to/scripts/backup.sh /var/backups/updkp
# ---------------------------------------------------------------------------
set -euo pipefail
DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
if [ -z "${DATABASE_URL:-}" ]; then echo "DATABASE_URL is required" >&2; exit 1; fi

echo "→ database dump"
pg_dump "$DATABASE_URL" --format=custom --file="$DEST/db-$STAMP.dump"

echo "→ uploads archive"
UPLOAD_DIR="${UPLOAD_DIR:-./storage/uploads}"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" 2>/dev/null || echo "  (no uploads dir yet)"

echo "→ rotating (keep newest 30)"
ls -1t "$DEST"/db-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --
ls -1t "$DEST"/uploads-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "Backup complete: $DEST/db-$STAMP.dump + $DEST/uploads-$STAMP.tar.gz"

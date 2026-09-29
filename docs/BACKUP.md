# Backup, restore & migrate

## What must be backed up

1. **PostgreSQL database** — all complaints, users, history, audit logs, settings.
2. **Upload volume** (`UPLOAD_DIR`) — complaint photos/PDFs are stored on disk, not in the DB.
   Backing up only the database is **not sufficient**.

## Automated backup (recommended)

```bash
DATABASE_URL=postgresql://... UPLOAD_DIR=/var/lib/updkp/uploads ./scripts/backup.sh /var/backups/updkp
```

This writes `db-YYYYMMDD-HHMMSS.dump` (custom format) + `uploads-YYYYMMDD-HHMMSS.tar.gz` and keeps
the newest 30 of each. Schedule daily:

```cron
0 2 * * * DATABASE_URL='...' UPLOAD_DIR='/var/lib/updkp/uploads' /opt/updkp/scripts/backup.sh /var/backups/updkp >> /var/log/updkp-backup.log 2>&1
```

Copy `/var/backups/updkp` off-site (e.g. `rclone`, S3 sync). Test restores quarterly.

## Manual backup

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%F).dump
tar -czf uploads-$(date +%F).tar.gz -C /var/lib/updkp uploads
```

## Restore

```bash
# 1. Database (to an EMPTY database to avoid conflicts)
pg_restore --clean --if-exists -d "$DATABASE_URL" /var/backups/updkp/db-YYYYMMDD-HHMMSS.dump

# 2. Uploads (filenames are content-addressed UUIDs — safe to overlay)
tar -xzf /var/backups/updkp/uploads-YYYYMMDD-HHMMSS.tar.gz -C /var/lib/updkp

# 3. Re-apply compatibility views, then restart
psql "$DATABASE_URL" -f database/views.sql
npm run build && npm start
```

## Migrating between hosts / providers

1. Put the app in maintenance mode (Admin → Settings → Maintenance mode).
2. Take a final backup (DB + uploads) and verify archive sizes.
3. On the new host: create the empty database, restore DB + uploads, apply `database/views.sql`,
   deploy the same commit, set the new `.env`, start, run `GET /api/health`.
4. Point DNS at the new host, disable maintenance mode, keep the old host for 7 days.

## Disaster recovery targets

- RPO ≤ 24h (daily backups), RTO ≤ 2h (restore + DNS).
- Audit logs live in the same database and are covered by the same backups.

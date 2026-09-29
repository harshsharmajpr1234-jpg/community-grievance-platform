# Deployment & operations (production)

## 1. Architecture (as deployed)

```
Android app (apps/mobile, Expo)
        │  Bearer JWT
        ▼
Public website + Admin panel (Next.js, same origin)
        │  HttpOnly cookie sessions / Bearer tokens
        ▼
REST API (Next.js App Router route handlers → framework-agnostic services in src/server)
        │
        ▼
PostgreSQL (Drizzle ORM) + persistent upload volume
```

> The request specified MySQL + Prisma + a separate Express service. This deployment uses the
> platform-supported stack (Next.js + PostgreSQL + Drizzle). The service layer (`src/server/services/*`)
> has no framework imports and can be lifted into an Express app unchanged; `database/views.sql`
> exposes the canonical table names (`user_profiles`, `complaint_attachments`,
> `complaint_status_history`, `admin_roles`, `roles`, `permissions`) for reporting and migration tooling.

## 2. Environment configurations

| Setting | Development | Staging | Production |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | local Postgres | staging Postgres (separate) | production Postgres (backed up) |
| `JWT_SECRET` | any dev string | unique random ≥32 chars | unique random ≥32 chars |
| `RESET_TOKEN_MINUTES` | `60` | `60` | `60` |
| `SEED_DEMO_DATA` | `true` allowed | `false` | `false` |
| `ADMIN_PASSWORD` | convenience | **empty** (use `/admin/setup`) | **empty** (use `/admin/setup`) |
| `ADMIN_SETUP_TOKEN` | optional | recommended | recommended |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` | optional | recommended | **required** |
| `UPLOAD_DIR` | `./storage/uploads` | persistent volume | persistent volume |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | staging HTTPS URL | production HTTPS URL |

Copy `.env.example` → `.env` per environment. Never commit `.env`.

## 3. First deploy (empty database)

```bash
npm ci
npx drizzle-kit migrate        # versioned migrations in drizzle/ (or push for a quick setup)
psql "$DATABASE_URL" -f database/views.sql
npm run build && npm start
```

On first start the server seeds **reference data only** (areas, 12 complaint categories, national
helplines) — never demo records. Then create the SUPER_ADMIN **one** of these ways:

1. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` (+ optional `ADMIN_SETUP_TOKEN`) before first start — the
   account is created once and **must change its password on first login**, or
2. Open `/admin/setup` (disabled automatically once any admin exists; requires `ADMIN_SETUP_TOKEN`
   when configured) and register the first SUPER_ADMIN.

Remove `ADMIN_PASSWORD` from the environment afterwards. Admin credentials are never displayed publicly.

## 4. Database migrations

- Authoritative schema: `src/db/schema.ts`.
- Generate a migration after schema edits: `npx drizzle-kit generate` → review `drizzle/*.sql` → apply
  with `npx drizzle-kit migrate` (production) or `npx drizzle-kit push` (local dev only).
- Re-apply `database/views.sql` after migrations that touch the underlying tables.
- Wrap data changes in transactions (all complaint writes already use `db.transaction`).

## 5. Persistent storage for attachments

- Uploads live in `UPLOAD_DIR`, **outside** `public/`, renamed to random UUIDs, served only through
  `/api/files/:name` after an authorization check (public files → owner/admins for private files).
- Allowed: JPG, JPEG, PNG, WEBP, PDF — MIME allow-list **plus magic-byte sniffing** plus size limits
  (configurable in Settings, SUPER_ADMIN only).
- Production: mount a persistent volume at `UPLOAD_DIR` (e.g. `/var/lib/updkp/uploads`) and include it
  in backups (`scripts/backup.sh` archives it next to the DB dump). For object storage, implement the
  `StorageProvider` interface in `src/server/storage.ts` and set `STORAGE_PROVIDER`/`STORAGE_KEY`/
  `STORAGE_BUCKET`. Never store production files only in temp folders.

## 6. Notifications (free-first, resilient)

| Channel | Config | Cost | Behaviour when unconfigured |
| --- | --- | --- | --- |
| In-app centre | none | free | always works (residents + admins) |
| Telegram bot (admin phone alerts) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | free | skipped silently; complaint creation unaffected |
| Email | `EMAIL_PROVIDER_URL` + `EMAIL_API_KEY`, `EMAIL_FROM` | free tiers available | skipped; logged |
| Email (login-adjacent) | `EMAIL_PROVIDER_URL` + `EMAIL_API_KEY` | free tiers available | required for password reset; see §7 |
| Browser/PWA push | `PUSH_PROVIDER_URL` + `PUSH_NOTIFICATION_KEY` | free | service worker ready; skipped |

New complaints trigger: in-app notification to `SUPER_ADMIN`/`COMPLAINT_ADMIN`/`MODERATOR` → Telegram
message (code, category, area, priority, status, admin link — **no resident PII**) → email to those
admins when configured. All external sends are deferred and best-effort: **a provider outage can never
block complaint creation** (verified by `tests/integration/api.test.ts` design + code review).

Telegram setup: message `@BotFather` → `/newbot` → put the token in `TELEGRAM_BOT_TOKEN`; message
`@userinfobot` (or add the bot to the admin group) for `TELEGRAM_ADMIN_CHAT_ID`. Format verified by
`tests/unit/telegram.test.ts`.

## 7. Password authentication in production (no OTP)

- Residents register with name, mobile, optional email, strong password (min 10 chars, upper/lower/digit),
  locality and terms acceptance; login accepts mobile number **or** email + password.
- Passwords are bcrypt-hashed (cost 12, `src/server/auth/password.ts`); legacy scrypt hashes from earlier
  versions still verify and are transparently re-hashed with bcrypt on next login.
- Brute-force protection: per-IP (30/15min) + per-identifier (8/15min) rate limits **plus** per-account
  failed-attempt counting with a 30-minute lockout after 8 failures (columns on `users`).
- Password reset is email-based: `POST /api/auth/forgot-password` issues a cryptographically secure,
  single-use token (SHA-256 hash at rest, `password_reset_tokens` table, configurable expiry) and emails
  a `/reset-password?token=…` link. Identical responses prevent account enumeration.
- If no email provider is configured, the endpoint returns `503 EMAIL_NOT_CONFIGURED`
  ("Password reset service is currently unavailable. Please contact support.") — never fake reset links.

## 8. HTTPS, cookies, headers

Serve behind a reverse proxy with TLS. Set `x-forwarded-for` / `x-forwarded-host` (rate limiting, audit
IPs, CSRF origin check). Cookies are `Secure` in production, `HttpOnly`, `SameSite=Lax`. Serve with
standard hardened headers (HSTS, `X-Content-Type-Options`, `frame-ancestors 'self'`) at the proxy/CDN.

## 9. Monitoring & logs

`GET /api/health` checks DB connectivity. Server logs use `[api]`, `[audit]`, `[notify]`, `[seed]`
prefixes — ship stdout to your aggregator. Stack traces are never returned to clients in production.

## 10. Going live checklist

- [ ] `.env` from `.env.example` with real secrets; `SEED_DEMO_DATA=false`
- [ ] Migrations applied; `database/views.sql` applied; backup cron active (docs/BACKUP.md)
- [ ] `UPLOAD_DIR` on a persistent volume; HTTPS + hardened headers; `APP_URL` correct (used in alerts)
- [ ] Telegram bot configured and test alert received; email/SMS providers configured or explicitly deferred
- [ ] First SUPER_ADMIN created via `/admin/setup`; `ADMIN_PASSWORD` removed; 2FA enabled (`ADMIN_REQUIRE_2FA=true` recommended)
- [ ] Full flow tested with real data (register → login → dashboard → complaint → attachment → admin alert → assign → status → resolve → feedback)
- [ ] `robots.txt` allows public pages only (`/admin`, `/api` disallowed); admin pages are `noindex`

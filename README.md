# United People of Dadi Ka Phatak — यूनाइटेड पीपल ऑफ दादी का फाटक

> **एक क्षेत्र — एक मंच — जनहित की आवाज़** · *हम साथ हैं, तो समाधान हैं...*

A production-ready, **non-partisan** community grievance and public-information platform for residents of
Dadi Ka Phatak (Jaipur) and surrounding localities. It contains three connected systems on one secure backend:

| System | Where | Notes |
| --- | --- | --- |
| Public website (PWA) | `src/app/(public)` | Hindi + English, mobile-first, installable, offline shell |
| Admin panel | `src/app/admin` | RBAC (6 roles), 2FA, audit logs, analytics, responsive |
| REST API (backend) | `src/app/api` + `src/server` | Same API used by web, admin and the mobile app |
| Android app (Expo) | `apps/mobile` | Bottom-tab app consuming the same API with bearer tokens |
| Database | `src/db` | MongoDB Atlas via official `mongodb` driver (schema & indexing) |
| Docs / tests | `docs/`, `tests/` | API reference, deployment, unit + integration tests |

> **Stack note.** This application runs on **Next.js 16 (App Router) route handlers as the REST backend + MongoDB Atlas**.
> The service layer (`src/server/services/*`) uses serverless connection pooling via singleton `MongoClient`.

## Features

- **Complaints** — 12 categories, locality hierarchy, address + optional GPS, photo/video/PDF uploads (magic-byte
  validated, renamed, served through an authorised endpoint), priority, contact preference, human-readable IDs
  (`JSM-2026-000001`), duplicate suggestions (never auto-deleted), rate limiting.
- **Lifecycle & tracking** — SUBMITTED → VERIFIED → ASSIGNED → FORWARDED → IN_PROGRESS → ACTION_TAKEN → RESOLVED
  (+ REJECTED / DUPLICATE / NEEDS_INFORMATION / CLOSED). Every change is a history row with timestamp; tracking by
  *Complaint ID + verified mobile* or via *My Complaints*. Residents can add information and mark
  **Problem Resolved / Problem Still Exists** (reopens the complaint).
- **Notices, Development works, Services directory, Community** — searchable, paginated, admin-managed;
  community posts need approval; official government links are distinguished from community information.
- **Notifications** — in-app centre for residents and admins; SMS/email/push are integration-ready (console fallback).
- **Admin** — dashboard (status/category/locality/monthly charts, avg resolution time), complaint search & filters,
  verify/assign/forward/status/note/public update/request-info/duplicate/resolve, settings (SUPER_ADMIN for critical
  keys), residents, admin team + roles, append-only audit logs, TOTP 2FA, forced password change on first login,
  first-run setup page.
- **Security** — bcrypt password hashing, HS256 JWT sessions in HttpOnly cookies (or bearer for
  mobile), same-origin check for cookie-authenticated mutations, register/login/reset/complaint/upload rate limits, account
  lockout, zod validation everywhere, parameterized queries, file type/size validation, private uploads dir, no secrets in code.
- **Privacy** — phone numbers, emails, addresses, GPS and private documents are never exposed publicly; account
  deletion request flow; privacy policy & terms pages.
- **SEO / PWA / a11y** — metadata, Open Graph, sitemap, robots, manifest + service worker, skip link, focus rings,
  ARIA labels, 44px tap targets, language switch (हिन्दी | English) with persisted preference.

## Quick start

```bash
cp .env.example .env          # fill MONGODB_URI, JWT_SECRET and provider credentials
npm install
npx tsx scripts/seed.ts       # reference data + [DEMO] records + first admin (from env)
npm run dev                   # http://localhost:3000
```

The server also calls `seedIfEmpty()` on startup (`src/instrumentation.ts`) so a fresh database gets reference
data automatically. **Production never seeds demo records** — `[DEMO]` data exists only in local development
(`SEED_DEMO_DATA=true` or `scripts/seed.ts --demo`, both refused under `NODE_ENV=production`).

### Authentication (production)

- **Resident:** `/register` (name, mobile, optional email, strong password, locality, terms) then
  `/login` with mobile number **or** email + password. Passwords are bcrypt-hashed (never plain text);
  login has per-IP/per-account rate limits plus failed-attempt lockout. No OTP exists anywhere in the system.
  Forgot password is email-based with single-use expiring tokens (`/forgot-password` → `/reset-password`).
- **Admin:** email + strong password with forced change on first login, optional TOTP 2FA
  (`ADMIN_REQUIRE_2FA=true` enforces it). First SUPER_ADMIN via `ADMIN_EMAIL`/`ADMIN_PASSWORD` (one-time)
  or the protected `/admin/setup` page (optional `ADMIN_SETUP_TOKEN`, auto-disabled afterwards).
- **Roles:** SUPER_ADMIN, COMPLAINT_ADMIN, CONTENT_ADMIN, MODERATOR, VIEWER (`src/shared/rbac.ts`).
- **Admin phone alerts:** free Telegram bot notifications on every new complaint
  (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`) — code, category, area and panel link only, no resident PII.

## Project structure

```
src/app/(public)/…      public pages: /, /about, /complaints, /complaints/track, /complaints/[id], /notices,
                        /development, /services, /community, /contact, /privacy, /terms, /help, /login, /profile
src/app/admin/…         /admin (dashboard), /admin/complaints, /admin/content/[type], /admin/users, /admin/admins,
                        /admin/audit-logs, /admin/settings, /admin/notifications, /admin/account, /admin/login, /admin/setup
src/app/api/…           REST API (see docs/API.md)
src/server/             backend: auth (account, session, password/TOTP), services (complaints, content, admin,
                        notifications, audit, settings), storage, integrations, rate limiting, API helpers
src/shared/             constants, RBAC, zod validation, i18n, DTO types (shared contract with mobile)
src/db/                 Drizzle schema, connection, seed
apps/mobile/            Expo Android app
docs/                   API.md, DEPLOYMENT.md
tests/                  vitest unit + integration tests
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npx drizzle-kit push` | apply schema (or `npx drizzle-kit generate` + `migrate` for SQL migration files) |
| `npx tsx scripts/seed.ts` | seed reference/demo data and env-based admin |
| `npx vitest run tests/unit` | unit tests (validation, RBAC, bcrypt/TOTP, reset tokens, timeline, uploads, Telegram format, view sync) |
| `RUN_INTEGRATION=true npx vitest run tests/integration` | DB-backed integration tests |
| `npm run typecheck` / `npm run lint` | quality gates |

See **docs/DEPLOYMENT.md** for production hardening and **docs/API.md** for the endpoint reference.

*This platform is not affiliated with any political party or candidate and contains no campaign, donation or advertising features.*

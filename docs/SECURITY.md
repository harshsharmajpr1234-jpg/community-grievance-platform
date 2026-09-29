# Security checklist (production)

## Authentication & sessions

- [x] Resident passwords: bcrypt (cost 12), never plain text; strong-password rules (10+ chars,
      upper/lower/digit) with confirmation; legacy scrypt hashes verified + transparently upgraded
- [x] Resident login: per-IP + per-identifier rate limits, per-account failed-attempt counting,
      30-minute lockout after 8 failures; no account enumeration on forgot-password
- [x] Password reset: cryptographically secure single-use tokens, SHA-256 hash at rest, configurable
      expiry; honest 503 when no email provider is configured (no fake reset links)
- [x] Admin passwords: scrypt (N=16384) salted hashes; 10+ chars with complexity rules; forced change on first login
- [x] Admin login: per-IP + per-email rate limits, failed-attempt counting, 30-min lockout after 8 failures
- [x] TOTP 2FA available per admin; `ADMIN_REQUIRE_2FA=true` enforces it organisation-wide
- [x] JWT (HS256) sessions in `HttpOnly`, `Secure` (prod), `SameSite=Lax` cookies; Bearer-token mode for mobile
- [x] First-admin setup disabled automatically once an admin exists; optional `ADMIN_SETUP_TOKEN`

## Authorization

- [x] RBAC on every admin route: SUPER_ADMIN, COMPLAINT_ADMIN, CONTENT_ADMIN, MODERATOR, VIEWER
      (permissions versioned in `src/shared/rbac.ts`, covered by unit tests)
- [x] Only SUPER_ADMIN changes critical settings and manages admin accounts
- [x] Normal admins have no database-level access (parameterised ORM queries only)
- [x] Audit logs are append-only — no update/delete API exists

## Request protection

- [x] zod validation on every route; consistent error envelope, no stack traces in production
- [x] CSRF: cookie-authenticated mutations require same-origin (configurable `CORS_ORIGINS`)
- [x] Rate limits: registration, resident/admin login, password reset, complaint creation, uploads, tracking, community posts
- [x] SQL injection: Drizzle parameterised queries throughout; XSS: React escaping + no raw HTML from users

## Files & privacy

- [x] Images (JPG/PNG/WEBP) + PDF only; MIME allow-list + magic-byte sniffing + size limits + random names
- [x] Uploads outside `public/`; authorised streaming; private documents never publicly reachable
- [x] Public API never exposes mobiles, emails, addresses, GPS or internal notes; admin UI masks them by role
- [x] No secrets in code or client bundle (only `NEXT_PUBLIC_*` is exposed); `.env` git-ignored

## Operations

- [ ] HTTPS + HSTS + hardened proxy headers; `x-forwarded-*` configured
- [ ] Secrets rotated (JWT, bot token, provider keys) on personnel changes
- [ ] Daily backups (DB + uploads) with quarterly restore tests — docs/BACKUP.md
- [ ] Log aggregation on `[api]`/`[audit]`/`[notify]` prefixes; alert on 5xx and lockouts
- [ ] Redis-backed rate limiting if running multiple instances (interface is centralised in `src/server/rate-limit.ts`)

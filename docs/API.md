# REST API reference

All responses use one envelope:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "title: Too small" } }
```

Authentication
- **Residents:** `POST /api/auth/register` creates the account, `POST /api/auth/login` sets an HttpOnly
  cookie (`updkp_user`) **and** returns `token` for mobile clients, which send `Authorization: Bearer <token>`.
- **Admins:** `POST /api/admin/login` sets `updkp_admin` (and returns `token`). Roles/permissions: `src/shared/rbac.ts`.
- Cookie-authenticated mutating requests must come from the same origin (CSRF guard). Extra origins: `CORS_ORIGINS`.
- Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `VALIDATION_ERROR`, `NOT_FOUND`,
  `RATE_LIMITED`, `MOBILE_EXISTS`, `EMAIL_EXISTS`, `EMAIL_NOT_CONFIGURED`, `RESET_TOKEN_INVALID`,
  `TOTP_REQUIRED`, `TOTP_INVALID`, `ACCOUNT_LOCKED`, `FILE_TOO_LARGE`,
  `UNSUPPORTED_FILE_TYPE`, `FILE_SIGNATURE_MISMATCH`, `CSRF_BLOCKED`, `INTERNAL_ERROR`.

## Environments & production notes

- There is no OTP anywhere in the system. Password reset requires a configured email provider;
  otherwise `POST /api/auth/forgot-password` returns `EMAIL_NOT_CONFIGURED` ("Password reset service
  is currently unavailable. Please contact support.") instead of fake reset links.
- Admin Telegram alerts need `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`; failures are logged
  server-side and never fail the complaint request.
- Canonical reporting names are exposed as SQL views — see `database/views.sql`
  (`user_profiles`, `complaint_attachments`, `complaint_status_history`, `admin_roles`).

## Public / resident

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ name, mobile, email?, password, confirmPassword, areaId, address?, acceptTerms }` | 10/h per IP |
| POST | `/api/auth/login` | `{ identifier, password }` | mobile or email; per-IP + per-account limits + lockout |
| POST | `/api/auth/forgot-password` | `{ email }` | single-use emailed link; 503 when email not configured |
| POST | `/api/auth/reset-password` | `{ token, newPassword, confirmPassword }` | expiring, single-use |
| GET/PATCH/DELETE | `/api/auth/me` | PATCH `{ name?, email?, areaId?, address?, language? }` | DELETE = deletion request |
| POST | `/api/auth/logout` | | |
| GET | `/api/meta` | | categories, areas, public settings |
| GET | `/api/stats` | | home page counters |
| GET | `/api/complaints` | `page,pageSize,q,status,categoryId,areaId,priority,from,to,mine` | public list is sanitised; `mine=true` needs login |
| POST | `/api/complaints` | `{ categoryId,title,description,areaId?,address?,latitude?,longitude?,priority?,contactPreference? }` | returns `{ complaint, possibleDuplicates }` |
| GET | `/api/complaints/similar` | `categoryId,areaId?,title` | duplicate suggestions |
| POST | `/api/complaints/track` | `{ code, mobile }` | owner view without login |
| GET | `/api/complaints/:idOrCode` | | owner sees more than public |
| PATCH | `/api/complaints/:idOrCode` | `{ message }` | resident adds information |
| POST | `/api/complaints/:idOrCode/documents` | multipart `file` | JPG/PNG/WEBP/MP4/WEBM/PDF, magic-byte checked |
| POST | `/api/complaints/:idOrCode/feedback` | `{ isResolved, rating?, comment? }` | "still exists" reopens |
| GET | `/api/files/:name` | | authorised file streaming |
| GET | `/api/notices` | `page,pageSize,q,category,areaId` or `id` | |
| GET | `/api/development` | `page,pageSize,q,status` or `id` | |
| GET | `/api/services` | `q,category` | |
| GET/POST | `/api/community` | POST `{ title,content,type,eventDate?,location?,areaId? }` | POST = pending moderation |
| GET/PATCH | `/api/notifications` | PATCH `{ ids? }` | mark read |

## Admin

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/api/admin/setup` | first SUPER_ADMIN when none exists (optional `ADMIN_SETUP_TOKEN`) |
| POST | `/api/admin/login` | `{ email, password, totp? }` — lockout after 8 failures |
| POST | `/api/admin/logout`, `/api/admin/change-password`, `/api/admin/2fa` | 2FA: `{ action: SETUP|ENABLE|DISABLE, code? }` |
| GET | `/api/admin/me`, `/api/admin/dashboard` | |
| GET | `/api/admin/complaints` | filters + search (ID, title, resident name, mobile) |
| GET/PATCH | `/api/admin/complaints/:id` | PATCH body is an action (below) |
| POST | `/api/admin/complaints/:id/update` | same as PATCH |
| GET/POST | `/api/admin/content/:type` | `notices|development|services|community|areas|categories` |
| GET/PATCH/DELETE | `/api/admin/content/:type/:id` | |
| GET | `/api/admin/users`, PATCH `/api/admin/users/:id` `{ isActive }` | |
| GET/POST | `/api/admin/admins`, PATCH `/api/admin/admins/:id` | |
| GET | `/api/admin/audit-logs` | read-only |
| GET/PATCH | `/api/admin/settings` | critical keys SUPER_ADMIN only |
| GET/PATCH | `/api/admin/notifications` | |

### Complaint actions (`PATCH /api/admin/complaints/:id`)

```json
{ "action": "VERIFY", "message": "optional" }
{ "action": "STATUS", "status": "IN_PROGRESS", "message": "…", "isPublic": true }
{ "action": "ASSIGN", "adminId": "uuid", "department": "PHED", "message": "…" }
{ "action": "FORWARD", "forwardedTo": "JEN, Ward office", "message": "…" }
{ "action": "NOTE", "message": "internal only" }
{ "action": "PUBLIC_UPDATE", "message": "shown to resident" }
{ "action": "REQUEST_INFO", "message": "please share a photo" }
{ "action": "DUPLICATE", "duplicateOfCode": "DPF-2026-000001" }
{ "action": "RESOLVE", "message": "…" }
{ "action": "PRIORITY", "priority": "URGENT" }
{ "action": "VISIBILITY", "isPublic": false }
```

Each action → `complaint_updates` row + `audit_logs` row (old/new values, IP) + resident notification where public.

### cURL walkthrough

```bash
AREA=$(curl -s localhost:3000/api/meta | jq -r '.data.areas[] | select(.type=="LOCALITY") | .id' | head -1)
curl -s -X POST localhost:3000/api/auth/register -H 'content-type: application/json' -d "{\"name\":\"Test Resident\",\"mobile\":\"9876543210\",\"password\":\"TestPass#123\",\"confirmPassword\":\"TestPass#123\",\"areaId\":\"$AREA\",\"acceptTerms\":true}"
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'content-type: application/json' -d '{"identifier":"9876543210","password":"TestPass#123"}' | jq -r .data.token)
CAT=$(curl -s localhost:3000/api/meta | jq -r .data.categories[0].id)
curl -s -X POST localhost:3000/api/complaints -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"categoryId\":\"$CAT\",\"title\":\"Street light not working\",\"description\":\"Pole near the crossing has been dark for a week.\"}"
curl -s -X POST localhost:3000/api/complaints/track -H 'content-type: application/json' -d '{"code":"DPF-2026-000006","mobile":"9876543210"}'
```

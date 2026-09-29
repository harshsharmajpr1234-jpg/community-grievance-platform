# Admin guide — Jan Samasya Nivaran Manch

Admin panel: `https://your-domain.example/admin`. Every action is audit-logged with your
account, timestamp, old/new values and IP address.

## Roles

| Role | Can do |
| --- | --- |
| SUPER_ADMIN | Everything: complaints, residents, all content, admin accounts, critical settings, audit logs |
| COMPLAINT_ADMIN | Verify, assign, forward, update status, notes, public updates, request info, duplicates, resolve; manage residents; view reports |
| CONTENT_ADMIN | Notices, development works, services directory, community posts, localities |
| MODERATOR | Verify complaints, internal/public notes, request info, mark duplicates, moderate community posts |
| VIEWER | Read-only: dashboard analytics and audit logs |

Only SUPER_ADMIN can create/deactivate admins (Admin Team page) and change critical settings
(upload limits, maintenance mode, 2FA requirement).

## Daily workflow — complaints

1. **Dashboard** shows new complaints awaiting verification plus live totals and charts.
2. Open a complaint: verify details, photos and location.
3. **Verify** → optionally **Assign** to a team member and/or set the department → **Forward**
   to the external office/officer when needed.
4. Post **Public updates** as work progresses; use **Internal notes** for team-only remarks.
5. If details are missing: **Request info** (resident is notified and can reply with text/photos).
6. If it repeats an existing issue: **Mark duplicate** with the original Complaint ID (the original
   is linked; nothing is deleted).
7. When done: **Resolve**. The resident is asked to confirm (**Problem Resolved / Still Exists**);
   "still exists" reopens the complaint automatically.
8. **Priority** and **Visibility** control urgency and whether the complaint appears publicly.

Status flow: Submitted → Verified → Assigned → Forwarded → In Progress → Action Taken → Resolved
(alternatives: Rejected with a reason, Duplicate, Needs Information, Closed).

## New-complaint alerts

When a resident submits, the panel notification bell updates immediately. If Telegram is configured,
your admin chat also receives: code, category, area, priority, status and a direct admin-panel link —
never resident personal data. Email alerts go out when the email provider is configured.

## Content

- **Notices**: drafts are invisible; `PUBLISHED` notices within their publish/expiry window appear
  publicly. Pin urgent ones. Attachments should be PDFs/images on stable URLs.
- **Development Works**: enter only admin-verified information (record the source in the verification
  note). Each save can append a dated progress entry with the new percentage.
- **Services Directory**: verify phone numbers before publishing; mark official government entries;
  unverified local numbers must stay unpublished.
- **Community**: resident posts sit in `PENDING` — approve or reject with a review note. Reject
  unverified accusations or defamatory content.

## Account security

Enable 2FA (My Account → Set up 2FA) with any authenticator app. Passwords are never visible to
anyone, including other admins; resets issue a temporary password that must be changed on next login.

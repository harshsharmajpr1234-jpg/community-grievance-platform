-- ---------------------------------------------------------------------------
-- Compatibility views mapping the normalised schema to the canonical table
-- names used across deployments. These are read-only projections:
--   user_profiles          <- users (resident profile fields)
--   complaint_attachments  <- complaint_documents (uploaded files)
--   complaint_status_history <- complaint_updates (permanent status-change history)
--   admin_roles            <- admins (role assignment per admin)
--   roles / permissions    <- RBAC catalog (source of truth: src/shared/rbac.ts)
-- Apply: psql "$DATABASE_URL" -f database/views.sql
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW user_profiles AS
SELECT id AS user_id, name, email, area_id, address, photo_url, language,
       created_at, updated_at
FROM users;

CREATE OR REPLACE VIEW complaint_attachments AS
SELECT d.id, d.complaint_id, c.code AS complaint_code, d.kind, d.stored_name,
       d.original_name, d.mime_type, d.size_bytes, d.is_public, d.created_at
FROM complaint_documents d
JOIN complaints c ON c.id = d.complaint_id;

CREATE OR REPLACE VIEW complaint_status_history AS
SELECT u.id, u.complaint_id, c.code AS complaint_code, u.old_status, u.new_status,
       u.message, u.admin_id, a.email AS changed_by_admin_email,
       u.user_id AS changed_by_user_id, u.is_public, u.created_at
FROM complaint_updates u
JOIN complaints c ON c.id = u.complaint_id
LEFT JOIN admins a ON a.id = u.admin_id
WHERE u.type = 'STATUS_CHANGE'
ORDER BY u.created_at;

CREATE OR REPLACE VIEW admin_roles AS
SELECT id AS admin_id, email AS admin_email, name AS admin_name, role,
       department, is_active, created_at
FROM admins;

CREATE OR REPLACE VIEW roles AS
SELECT unnest(ARRAY['SUPER_ADMIN', 'COMPLAINT_ADMIN', 'CONTENT_ADMIN', 'MODERATOR', 'VIEWER']) AS role;

CREATE OR REPLACE VIEW permissions AS
SELECT unnest(ARRAY[
  'analytics.view',
  'complaints.view', 'complaints.view_sensitive', 'complaints.verify',
  'complaints.assign', 'complaints.forward', 'complaints.update_status',
  'complaints.note', 'complaints.public_update', 'complaints.request_info',
  'complaints.duplicate', 'complaints.resolve',
  'users.view', 'users.manage',
  'notices.manage', 'development.manage', 'services.manage',
  'community.manage', 'areas.manage',
  'admins.view', 'admins.manage',
  'settings.view', 'settings.manage', 'settings.critical',
  'audit.view', 'notifications.view'
]) AS permission;
-- NOTE: keep roles/permissions views in sync with src/shared/rbac.ts
-- (covered by tests/unit/schema-views.test.ts).

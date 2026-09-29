import type { AdminRole } from "./constants";

/**
 * Role based access control. Permissions are defined in code so they are
 * versioned with the application; the role assigned to an admin lives in the
 * database (`admins.role`).
 */
export const PERMISSIONS = [
  "analytics.view",
  "complaints.view",
  "complaints.view_sensitive", // resident contact details, internal notes
  "complaints.verify",
  "complaints.assign",
  "complaints.forward",
  "complaints.update_status",
  "complaints.note",
  "complaints.public_update",
  "complaints.request_info",
  "complaints.duplicate",
  "complaints.resolve",
  "users.view",
  "users.manage",
  "notices.manage",
  "development.manage",
  "services.manage",
  "community.manage",
  "areas.manage",
  "admins.view",
  "admins.manage",
  "settings.view",
  "settings.manage",
  "settings.critical",
  "audit.view",
  "notifications.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  COMPLAINT_ADMIN: [
    "analytics.view",
    "complaints.view",
    "complaints.view_sensitive",
    "complaints.verify",
    "complaints.assign",
    "complaints.forward",
    "complaints.update_status",
    "complaints.note",
    "complaints.public_update",
    "complaints.request_info",
    "complaints.duplicate",
    "complaints.resolve",
    "users.view",
    "users.manage",
    "audit.view",
    "notifications.view",
  ],
  CONTENT_ADMIN: [
    "analytics.view",
    "notices.manage",
    "development.manage",
    "services.manage",
    "community.manage",
    "areas.manage",
    "audit.view",
    "notifications.view",
  ],
  MODERATOR: [
    "analytics.view",
    "complaints.view",
    "complaints.view_sensitive",
    "complaints.verify",
    "complaints.note",
    "complaints.public_update",
    "complaints.request_info",
    "complaints.duplicate",
    "community.manage",
    "audit.view",
    "notifications.view",
  ],
  VIEWER: ["analytics.view", "complaints.view", "audit.view", "notifications.view"],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsForRole(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

import { describe, expect, it } from "vitest";
import { ADMIN_ROLES } from "@/shared/constants";
import { PERMISSIONS, hasPermission, permissionsForRole } from "@/shared/rbac";

describe("RBAC", () => {
  it("super admin has every permission", () => {
    for (const p of PERMISSIONS) expect(hasPermission("SUPER_ADMIN", p)).toBe(true);
  });
  it("viewer is read-only", () => {
    expect(hasPermission("VIEWER", "complaints.view")).toBe(true);
    expect(hasPermission("VIEWER", "complaints.update_status")).toBe(false);
    expect(hasPermission("VIEWER", "settings.manage")).toBe(false);
  });
  it("content admin cannot touch complaints", () => {
    expect(hasPermission("CONTENT_ADMIN", "notices.manage")).toBe(true);
    expect(hasPermission("CONTENT_ADMIN", "complaints.view")).toBe(false);
    expect(hasPermission("COMPLAINT_ADMIN", "complaints.resolve")).toBe(true);
    expect(hasPermission("COMPLAINT_ADMIN", "notices.manage")).toBe(false);
    expect(hasPermission("MODERATOR", "complaints.verify")).toBe(true);
    expect(hasPermission("MODERATOR", "complaints.assign")).toBe(false);
  });
  it("only super admin can change critical settings or manage admins", () => {
    for (const role of ADMIN_ROLES.filter((r) => r !== "SUPER_ADMIN")) {
      expect(hasPermission(role, "settings.critical")).toBe(false);
      expect(hasPermission(role, "admins.manage")).toBe(false);
    }
  });
  it("every role has a permission list", () => {
    for (const role of ADMIN_ROLES) expect(Array.isArray(permissionsForRole(role))).toBe(true);
  });
});

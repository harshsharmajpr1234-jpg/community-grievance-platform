import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTelegramNewComplaintMessage } from "@/server/integrations";

describe("telegram admin alert", () => {
  const msg = buildTelegramNewComplaintMessage({
    code: "DPF-2026-000123",
    category: "Street Light",
    area: "Dadi Ka Phatak",
    priority: "HIGH",
    status: "SUBMITTED",
    adminUrl: "https://example.example/admin/complaints/DPF-2026-000123",
  });
  it("matches the required format", () => {
    expect(msg).toContain("NEW COMPLAINT");
    expect(msg).toContain("DPF-2026-000123");
    expect(msg).toContain("Street Light");
    expect(msg).toContain("Dadi Ka Phatak");
    expect(msg).toContain("SUBMITTED");
    expect(msg).toContain("https://example.example/admin/complaints/DPF-2026-000123");
  });
  it("never contains private resident information", () => {
    const leak = ["98765", "@", "House", "gps", "latitude"];
    for (const word of leak) expect(msg.toLowerCase()).not.toContain(word);
    // Only the admin-panel URL may contain an @ (none here) — assert no PII fields
    expect(msg).not.toMatch(/mobile|address|resident/i);
  });
});

describe("schema views stay in sync", () => {
  it("database/views.sql covers the canonical table names", () => {
    const sql = readFileSync("database/views.sql", "utf8");
    for (const view of ["user_profiles", "complaint_attachments", "complaint_status_history", "admin_roles", "roles", "permissions"]) {
      expect(sql).toContain(`CREATE OR REPLACE VIEW ${view}`);
    }
  });
  it("permissions view matches the RBAC catalog", async () => {
    const sql = readFileSync("database/views.sql", "utf8");
    const { PERMISSIONS } = await import("@/shared/rbac");
    for (const p of PERMISSIONS) expect(sql).toContain(`'${p}'`);
  });
  it("roles view matches the role catalog", async () => {
    const sql = readFileSync("database/views.sql", "utf8");
    const { ADMIN_ROLES } = await import("@/shared/constants");
    for (const r of ADMIN_ROLES) expect(sql).toContain(`'${r}'`);
  });
});

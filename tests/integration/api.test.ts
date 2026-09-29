/**
 * Integration tests — run against a live MongoDB (MONGODB_URI).
 * They exercise registration, password login, brute-force lockout, password reset,
 * the complaint lifecycle, ownership enforcement, admin RBAC and status updates.
 *
 * Run: RUN_INTEGRATION=true npx vitest run tests/integration
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collections } from "@/db";
import { hashPassword } from "@/server/auth/password";
import { generateResetToken, loginUser, registerUser, requestPasswordReset, resetPassword } from "@/server/auth/account";
import { seedReferenceData } from "@/db/seed";
import { markNotificationsRead, unreadCount } from "@/server/services/notifications";
import { addUserResponse, applyAdminAction, createComplaint, getComplaintDetail, listUserComplaints, trackComplaint } from "@/server/services/complaints";

const MOBILE_A = "9999912345";
const MOBILE_B = "9999912346";
const MOBILE_LOCK = "9999912347";
const MOBILE_CASE = "9999912348";
const EMAIL_CASE = "MixedCase@Example.com";
const EMAIL_A = "integration-a@updkp.local";
const PASSWORD = "Integration#123";
const ADMIN_EMAIL = "test-admin@updkp.local";

describe.skipIf(process.env.RUN_INTEGRATION !== "true")("resident auth + complaint lifecycle (integration)", () => {
  let userIdA = "";
  let userIdB = "";
  let categoryId = "";
  let areaId = "";
  let code = "";

  const registerInput = (mobile: string, email?: string) => ({
    name: "Test Resident",
    mobile,
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    ward: "Ward 12" as const,
    acceptTerms: true as const,
  });

  beforeAll(async () => {
    await seedReferenceData();
    const c = await collections();
    await c.users.deleteMany({ mobile: { $in: [MOBILE_A, MOBILE_B, MOBILE_LOCK, MOBILE_CASE] } });
    await c.admins.deleteMany({ email: ADMIN_EMAIL });
    const cat = await c.complaintCategories.findOne({});
    categoryId = cat!.id;
    const area = await c.areas.findOne({ type: "LOCALITY" });
    areaId = area!.id;
  });

  afterAll(async () => {
    const c = await collections();
    await c.complaints.deleteMany({ userId: userIdA });
    await c.users.deleteMany({ mobile: { $in: [MOBILE_A, MOBILE_B, MOBILE_LOCK, MOBILE_CASE] } });
    await c.admins.deleteMany({ email: ADMIN_EMAIL });
  });

  it("registers a resident with a hashed password", async () => {
    const profile = await registerUser(registerInput(MOBILE_A, EMAIL_A), "127.0.0.1");
    userIdA = profile.id;
    expect(profile.mobileMasked).toContain("XXXXXX");
    const c = await collections();
    const row = (await c.users.findOne({ id: userIdA }))!;
    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(row.passwordHash.startsWith("$2")).toBe(true);
    await expect(registerUser(registerInput(MOBILE_A), "127.0.0.1")).rejects.toThrow(/already exists/);
  });

  it("logs in with the exact registered email casing and password (regression)", async () => {
    // Registration stores the email lowercased; login must accept the exact
    // string the user typed at registration as well as lowercase and mobile.
    const profile = await registerUser(registerInput(MOBILE_CASE, EMAIL_CASE), "127.0.0.1");
    expect(profile.email).toBe(EMAIL_CASE.toLowerCase());
    const byOriginalCase = await loginUser({ identifier: EMAIL_CASE, password: PASSWORD }, "127.0.0.1");
    expect(byOriginalCase.user.id).toBe(profile.id);
    const byLowerCase = await loginUser({ identifier: EMAIL_CASE.toLowerCase(), password: PASSWORD }, "127.0.0.1");
    expect(byLowerCase.user.id).toBe(profile.id);
    const byIntlMobile = await loginUser({ identifier: "+91 99999 12348", password: PASSWORD }, "127.0.0.1");
    expect(byIntlMobile.user.id).toBe(profile.id);
  });

  it("logs in with mobile or email, rejects wrong passwords", async () => {
    const byMobile = await loginUser({ identifier: MOBILE_A, password: PASSWORD }, "127.0.0.1");
    expect(byMobile.user.id).toBe(userIdA);
    expect(byMobile.token.length).toBeGreaterThan(20);
    const byEmail = await loginUser({ identifier: EMAIL_A, password: PASSWORD }, "127.0.0.1");
    expect(byEmail.user.id).toBe(userIdA);
    await expect(loginUser({ identifier: MOBILE_A, password: "Wrong#123" }, "127.0.0.1")).rejects.toThrow(/Invalid/);
  });

  it("locks accounts after repeated failures (brute-force protection)", async () => {
    await registerUser(registerInput(MOBILE_LOCK), "127.0.0.1");
    for (let i = 0; i < 8; i++) {
      await expect(loginUser({ identifier: MOBILE_LOCK, password: "Wrong#123" }, "127.0.0.1")).rejects.toThrow();
    }
    const c = await collections();
    const row = (await c.users.findOne({ mobile: MOBILE_LOCK }))!;
    expect(row.lockedUntil).not.toBeNull();
    await expect(loginUser({ identifier: MOBILE_LOCK, password: PASSWORD }, "127.0.0.1")).rejects.toThrow();
  });

  it("reports reset service unavailable without an email provider", async () => {
    await expect(requestPasswordReset({ email: EMAIL_A }, "127.0.0.1")).rejects.toThrow(/currently unavailable/);
  });

  it("resets passwords with single-use expiring tokens", async () => {
    const { token, tokenHash } = generateResetToken();
    const c = await collections();
    await c.passwordResetTokens.insertOne({ id: tokenHash, userId: userIdA, tokenHash, expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date() });
    await resetPassword({ token, newPassword: "BrandNew#456", confirmPassword: "BrandNew#456" });
    // Token is single-use
    await expect(resetPassword({ token, newPassword: "Other#789", confirmPassword: "Other#789" })).rejects.toThrow(/invalid or has expired/);
    // Unknown tokens are rejected
    await expect(resetPassword({ token: "f".repeat(64), newPassword: "Other#789", confirmPassword: "Other#789" })).rejects.toThrow();
    // New password works, old one does not
    await loginUser({ identifier: MOBILE_A, password: "BrandNew#456" }, "127.0.0.1");
    await expect(loginUser({ identifier: MOBILE_A, password: PASSWORD }, "127.0.0.1")).rejects.toThrow();
    // Token hashes at rest reveal nothing about the password
    const stored = (await c.passwordResetTokens.findOne({ tokenHash: createHash("sha256").update(token).digest("hex") }))!;
    expect(stored.usedAt).not.toBeNull();
  });

  it("creates a complaint with a DPF code and enforces ownership", async () => {
    const profile = await registerUser(registerInput(MOBILE_B), "127.0.0.1");
    userIdB = profile.id;
    const c = await collections();
    const userA = (await c.users.findOne({ id: userIdA }))!;
    const { complaint } = await createComplaint(userA, { wardNumber: "12", areaSource: "VERIFIED_AREA", categoryId, title: "Integration test pothole", description: "There is a deep pothole on the road near the test landmark.", priority: "HIGH", contactPreference: "SMS", address: "Secret house 12", areaId }, "127.0.0.1");
    code = complaint.code;
    expect(code).toMatch(/^(JSM|DPF)-\d{4}-\d{6}$/);

    const owner = await getComplaintDetail(code, { kind: "owner", userId: userIdA });
    expect(owner.address).toBe("Secret house 12");

    // Another resident — even logged in — sees only the public view, never private details
    const stranger = await getComplaintDetail(code, { kind: "owner", userId: userIdB });
    expect(stranger.address).toBeNull();
    expect(stranger.isOwner).toBe(false);
    const pub = await getComplaintDetail(code, { kind: "public" });
    expect(pub.address).toBeNull();
    await expect(addUserResponse({ ...userA, id: userIdB } as typeof userA, code, "hijack")).rejects.toThrow();

    // /api/me/complaints equivalent returns only the owner's rows
    const mine = await listUserComplaints(userIdA, { page: 1, pageSize: 10, q: undefined, status: undefined, categoryId: undefined, areaId: undefined, priority: undefined, assignedAdminId: undefined, from: undefined, to: undefined, mine: true });
    expect(mine.items.length).toBe(1);
    const others = await listUserComplaints(userIdB, { page: 1, pageSize: 10, q: undefined, status: undefined, categoryId: undefined, areaId: undefined, priority: undefined, assignedAdminId: undefined, from: undefined, to: undefined, mine: true });
    expect(others.items.length).toBe(0);
  });

  it("tracks by code + mobile only", async () => {
    await expect(trackComplaint(code, "9999900000", "127.0.0.1")).rejects.toThrow();
    const d = await trackComplaint(code, MOBILE_A, "127.0.0.1");
    expect(d.status).toBe("SUBMITTED");
  });

  it("notifies, marks read, and enforces RBAC with status history", async () => {
    expect(await unreadCount({ userId: userIdA })).toBeGreaterThan(0);
    await markNotificationsRead({ userId: userIdA });
    expect(await unreadCount({ userId: userIdA })).toBe(0);

    const c = await collections();
    const adminId = "test-admin-id-123";
    await c.admins.insertOne({
      id: adminId,
      email: ADMIN_EMAIL,
      name: "Viewer",
      passwordHash: await hashPassword("Password123!"),
      role: "VIEWER",
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const viewer = (await c.admins.findOne({ id: adminId }))!;
    const ctx = { admin: viewer, ip: "127.0.0.1", userAgent: null };
    await expect(applyAdminAction(ctx, code, { action: "VERIFY" })).rejects.toThrow(/permission/);

    await c.admins.updateOne({ id: adminId }, { $set: { role: "SUPER_ADMIN" } });
    const superAdmin = (await c.admins.findOne({ id: adminId }))!;
    const after = await applyAdminAction({ ...ctx, admin: superAdmin }, code, { action: "VERIFY" });
    expect(after.status).toBe("VERIFIED");
    expect(after.updates.filter((u) => u.type === "STATUS_CHANGE").length).toBe(2);
  });
});

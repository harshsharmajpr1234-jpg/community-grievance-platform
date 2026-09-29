import { randomUUID } from "node:crypto";
import { collections } from "@/db";
import type { Admin } from "@/db/schema";
import { ApiError, type AdminContext } from "@/server/api";
import { generateTotpSecret, hashPassword, totpUri, verifyPassword, verifyTotp } from "@/server/auth/password";
import { ADMIN_SESSION_SECONDS, signToken } from "@/server/auth/session";
import { LIMITS, rateLimit, resetRateLimit } from "@/server/rate-limit";
import { OPEN_STATUSES, type AdminRole, type ComplaintStatus } from "@/shared/constants";
import { permissionsForRole } from "@/shared/rbac";
import type { z } from "zod";
import type { adminCreateSchema, adminSetupSchema, adminUpdateSchema } from "@/shared/validation";
import { logAudit } from "./audit";
import { getSettings } from "./settings";
import { env } from "@/lib/env";

export function safeAdmin(admin: Admin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    department: admin.department,
    isActive: admin.isActive,
    mustChangePassword: admin.mustChangePassword,
    twoFactorEnabled: admin.twoFactorEnabled,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    permissions: permissionsForRole(admin.role),
  };
}
export type SafeAdmin = ReturnType<typeof safeAdmin>;

/* ------------------------------------------------------------------ */
/* Authentication                                                       */
/* ------------------------------------------------------------------ */
export async function adminLogin(input: { email: string; password: string; totp?: string }, ip: string, userAgent: string | null) {
  const perIp = rateLimit(`admin:login:ip:${ip}`, LIMITS.adminLoginPerIp.limit, LIMITS.adminLoginPerIp.windowMs);
  const perEmail = rateLimit(`admin:login:email:${input.email}`, LIMITS.adminLoginPerEmail.limit, LIMITS.adminLoginPerEmail.windowMs);
  if (!perIp.allowed || !perEmail.allowed) throw new ApiError(429, "RATE_LIMITED", "Too many login attempts. Please wait 15 minutes.");

  const c = await collections();
  let admin: Admin | null = await c.admins.findOne({ email: input.email.trim().toLowerCase() });

  // Auto-initialize SUPER_ADMIN if matching target initial credentials and admin does not exist yet
  if (!admin) {
    const targetInitialEmail = (process.env.ADMIN_INITIAL_EMAIL || env.adminEmail || "riteshsharmajpr123@gmail.com").trim().toLowerCase();
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || env.adminPassword;
    if (input.email.trim().toLowerCase() === targetInitialEmail && initialPassword && input.password === initialPassword) {
      const passwordHash = await hashPassword(input.password);
      const now = new Date();
      const newAdmin: Admin = {
        id: randomUUID(),
        email: targetInitialEmail,
        name: "Ritesh Sharma (Super Admin)",
        passwordHash,
        role: "SUPER_ADMIN",
        department: "Administration",
        isActive: true,
        mustChangePassword: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await c.admins.insertOne(newAdmin);
      admin = newAdmin;
    }
  }

  const invalid = () => new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  if (!admin || !admin.isActive) throw invalid();
  if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
    throw new ApiError(423, "ACCOUNT_LOCKED", "Account temporarily locked due to failed attempts. Try again later.");
  }
  const isMatch = await verifyPassword(input.password, admin.passwordHash);
  if (!isMatch) {
    const failed = admin.failedLoginAttempts + 1;
    await c.admins.updateOne(
      { id: admin.id },
      { $set: { failedLoginAttempts: failed, lockedUntil: failed >= 8 ? new Date(Date.now() + 30 * 60 * 1000) : null } }
    );
    throw invalid();
  }
  const settings = await getSettings();
  if (admin.twoFactorEnabled) {
    if (!input.totp) throw new ApiError(401, "TOTP_REQUIRED", "Enter the 6 digit code from your authenticator app");
    if (!admin.twoFactorSecret || !verifyTotp(admin.twoFactorSecret, input.totp)) throw new ApiError(401, "TOTP_INVALID", "Invalid authenticator code");
  }
  const now = new Date();
  await c.admins.updateOne({ id: admin.id }, { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now } });
  resetRateLimit(`admin:login:email:${input.email}`);
  const token = await signToken({ kind: "admin", sub: admin.id, email: admin.email, role: admin.role, pv: 0 }, ADMIN_SESSION_SECONDS);
  await logAudit({ admin, ip, userAgent }, "admin.login", "admin", admin.id);
  return {
    token,
    admin: safeAdmin(admin),
    twoFactorSetupRequired: settings.require2fa && !admin.twoFactorEnabled,
  };
}

export async function adminCount(): Promise<number> {
  const c = await collections();
  return c.admins.countDocuments();
}

/** First-run setup: creates the first SUPER_ADMIN when no admin exists. */
export async function setupFirstAdmin(input: z.infer<typeof adminSetupSchema>, ip: string) {
  if ((await adminCount()) > 0) throw new ApiError(403, "SETUP_DISABLED", "Setup has already been completed");
  if (env.setupToken && env.setupToken !== input.setupToken) throw new ApiError(403, "INVALID_SETUP_TOKEN", "Invalid setup token");
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const newAdmin: Admin = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name,
    passwordHash,
    role: "SUPER_ADMIN",
    department: null,
    isActive: true,
    mustChangePassword: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const c = await collections();
  await c.admins.insertOne(newAdmin);
  await logAudit({ admin: newAdmin, ip, userAgent: null }, "admin.setup", "admin", newAdmin.id, null, { email: newAdmin.email });
  return safeAdmin(newAdmin);
}

export async function changeAdminPassword(ctx: AdminContext, currentPassword: string, newPassword: string) {
  const isMatch = await verifyPassword(currentPassword, ctx.admin.passwordHash);
  if (!isMatch) throw new ApiError(400, "INVALID_CREDENTIALS", "Current password is incorrect");
  const isSame = await verifyPassword(newPassword, ctx.admin.passwordHash);
  if (isSame) throw new ApiError(400, "VALIDATION_ERROR", "New password must be different");
  const passwordHash = await hashPassword(newPassword);
  const c = await collections();
  await c.admins.updateOne({ id: ctx.admin.id }, { $set: { passwordHash, mustChangePassword: false, updatedAt: new Date() } });
  await logAudit(ctx, "admin.change_password", "admin", ctx.admin.id);
}

export async function manageTwoFactor(ctx: AdminContext, action: "SETUP" | "ENABLE" | "DISABLE", code?: string) {
  const c = await collections();
  if (action === "SETUP") {
    const secret = generateTotpSecret();
    await c.admins.updateOne({ id: ctx.admin.id }, { $set: { twoFactorSecret: secret, twoFactorEnabled: false, updatedAt: new Date() } });
    return { secret, uri: totpUri(secret, ctx.admin.email) };
  }
  if (!ctx.admin.twoFactorSecret) throw new ApiError(400, "TOTP_NOT_SETUP", "Start 2FA setup first");
  if (!code || !verifyTotp(ctx.admin.twoFactorSecret, code)) throw new ApiError(400, "TOTP_INVALID", "Invalid authenticator code");
  if (action === "ENABLE") {
    await c.admins.updateOne({ id: ctx.admin.id }, { $set: { twoFactorEnabled: true, updatedAt: new Date() } });
    await logAudit(ctx, "admin.2fa_enabled", "admin", ctx.admin.id);
    return { enabled: true };
  }
  await c.admins.updateOne({ id: ctx.admin.id }, { $set: { twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() } });
  await logAudit(ctx, "admin.2fa_disabled", "admin", ctx.admin.id);
  return { enabled: false };
}

/* ------------------------------------------------------------------ */
/* Admin management                                                     */
/* ------------------------------------------------------------------ */
export async function listAdmins() {
  const c = await collections();
  const rows = await c.admins.find({}).sort({ createdAt: 1 }).toArray();
  return rows.map(safeAdmin);
}

export async function createAdmin(ctx: AdminContext, input: z.infer<typeof adminCreateSchema>) {
  const c = await collections();
  const existing = await c.admins.findOne({ email: input.email.trim().toLowerCase() });
  if (existing) throw new ApiError(409, "EMAIL_EXISTS", "An admin with this email already exists");
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const newAdmin: Admin = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name,
    role: input.role,
    department: input.department ?? null,
    passwordHash,
    isActive: true,
    mustChangePassword: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await c.admins.insertOne(newAdmin);
  await logAudit(ctx, "admin.create", "admin", newAdmin.id, null, { email: newAdmin.email, role: newAdmin.role });
  return safeAdmin(newAdmin);
}

export async function updateAdmin(ctx: AdminContext, id: string, input: z.infer<typeof adminUpdateSchema>) {
  const c = await collections();
  const old = await c.admins.findOne({ id });
  if (!old) throw new ApiError(404, "NOT_FOUND", "Admin not found");
  if (old.id === ctx.admin.id && (input.isActive === false || (input.role && input.role !== "SUPER_ADMIN"))) {
    throw new ApiError(400, "VALIDATION_ERROR", "You cannot deactivate or demote your own account");
  }
  const { resetPassword, ...rest } = input;
  const passwordHash = resetPassword ? await hashPassword(resetPassword) : undefined;
  const patch: Partial<Admin> = {
    ...rest,
    ...(passwordHash ? { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null } : {}),
    updatedAt: new Date(),
  };

  await c.admins.updateOne({ id }, { $set: patch });
  const updated = { ...old, ...patch };
  await logAudit(ctx, "admin.update", "admin", id, { role: old.role, isActive: old.isActive }, { ...rest, passwordReset: Boolean(resetPassword) });
  return safeAdmin(updated);
}

/* ------------------------------------------------------------------ */
/* Users                                                                */
/* ------------------------------------------------------------------ */
export async function listUsers(p: { page: number; pageSize: number; q?: string }, sensitive: boolean) {
  const c = await collections();
  const filter: any = {};
  if (p.q?.trim()) {
    const term = p.q.trim();
    filter.$or = [{ name: { $regex: term, $options: "i" } }, { mobile: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }];
  }

  const total = await c.users.countDocuments(filter);
  const skip = (p.page - 1) * p.pageSize;
  const userList = await c.users.find(filter).sort({ createdAt: -1 }).skip(skip).limit(p.pageSize).toArray();

  const rows = await Promise.all(
    userList.map(async (u) => {
      const area = u.areaId ? await c.areas.findOne({ id: u.areaId }) : null;
      const complaintCount = await c.complaints.countDocuments({ userId: u.id });
      return {
        id: u.id,
        name: u.name,
        mobile: sensitive ? u.mobile : `${u.mobile.slice(0, 2)}XXXXXX${u.mobile.slice(-2)}`,
        email: sensitive ? u.email : null,
        area: area ? { id: area.id, name: area.name } : null,
        isActive: u.isActive,
        language: u.language,
        deletionRequestedAt: u.deletionRequestedAt,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        complaintCount,
      };
    })
  );

  return { rows, total };
}

export async function setUserActive(ctx: AdminContext, id: string, isActive: boolean) {
  const c = await collections();
  const res = await c.users.updateOne({ id }, { $set: { isActive, updatedAt: new Date() } });
  if (res.matchedCount === 0) throw new ApiError(404, "NOT_FOUND", "User not found");
  await logAudit(ctx, isActive ? "user.activate" : "user.deactivate", "user", id);
}

/* ------------------------------------------------------------------ */
/* Dashboard analytics                                                 */
/* ------------------------------------------------------------------ */
export async function dashboardStats() {
  const c = await collections();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [allComplaints, totalUsers, pendingPosts, activeNotices, newThisWeek] = await Promise.all([
    c.complaints.find({}).toArray(),
    c.users.countDocuments(),
    c.communityPosts.countDocuments({ status: "PENDING" }),
    c.notices.countDocuments({ status: "PUBLISHED" }),
    c.complaints.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const comp of allComplaints) {
    statusMap[comp.status] = (statusMap[comp.status] || 0) + 1;
  }

  const total = allComplaints.length;
  const resolved = (statusMap.RESOLVED ?? 0) + (statusMap.CLOSED ?? 0);
  const open = OPEN_STATUSES.reduce((acc, s) => acc + (statusMap[s] ?? 0), 0);

  const resolvedItems = allComplaints.filter((item) => item.resolvedAt && item.createdAt);
  let avgResolutionHours: number | null = null;
  if (resolvedItems.length > 0) {
    const totalMs = resolvedItems.reduce((acc, item) => acc + (new Date(item.resolvedAt!).getTime() - new Date(item.createdAt).getTime()), 0);
    avgResolutionHours = Math.round(totalMs / (resolvedItems.length * 3600 * 1000));
  }

  const recentSubmitted = allComplaints
    .filter((comp) => comp.status === "SUBMITTED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const recentNew = await Promise.all(
    recentSubmitted.map(async (comp) => {
      const category = comp.categoryId ? await c.complaintCategories.findOne({ id: comp.categoryId }) : null;
      const area = comp.areaId ? await c.areas.findOne({ id: comp.areaId }) : null;
      return {
        id: comp.id,
        code: comp.code,
        title: comp.title,
        priority: comp.priority,
        category: category ? { nameEn: category.nameEn, nameHi: category.nameHi } : null,
        area: area ? { name: area.name, nameHi: area.nameHi } : null,
        createdAt: comp.createdAt,
      };
    })
  );

  const catMap: Record<string, { nameEn: string; nameHi: string; n: number }> = {};
  const areaMap: Record<string, { name: string; n: number }> = {};
  const wardStatsMap: Record<string, { total: number; pending: number; inProgress: number; resolved: number }> = {
    "12": { total: 0, pending: 0, inProgress: 0, resolved: 0 },
    "13": { total: 0, pending: 0, inProgress: 0, resolved: 0 },
    "14": { total: 0, pending: 0, inProgress: 0, resolved: 0 },
  };

  for (const comp of allComplaints) {
    const rawWard = (comp.wardNumber || "").replace(/\D/g, "");
    const wardKey = rawWard === "12" ? "12" : rawWard === "13" ? "13" : rawWard === "14" ? "14" : null;
    if (wardKey && wardStatsMap[wardKey]) {
      wardStatsMap[wardKey].total += 1;
      if (["SUBMITTED", "VERIFIED", "NEEDS_INFORMATION"].includes(comp.status)) {
        wardStatsMap[wardKey].pending += 1;
      } else if (["ASSIGNED", "FORWARDED", "IN_PROGRESS", "ACTION_TAKEN"].includes(comp.status)) {
        wardStatsMap[wardKey].inProgress += 1;
      } else if (["RESOLVED", "CLOSED"].includes(comp.status)) {
        wardStatsMap[wardKey].resolved += 1;
      }
    }

    if (comp.categoryId) {
      if (!catMap[comp.categoryId]) {
        const cat = await c.complaintCategories.findOne({ id: comp.categoryId });
        if (cat) catMap[comp.categoryId] = { nameEn: cat.nameEn, nameHi: cat.nameHi, n: 0 };
      }
      if (catMap[comp.categoryId]) catMap[comp.categoryId].n += 1;
    }
    if (comp.areaId) {
      if (!areaMap[comp.areaId]) {
        const area = await c.areas.findOne({ id: comp.areaId });
        if (area) areaMap[comp.areaId] = { name: area.name, n: 0 };
      }
      if (areaMap[comp.areaId]) areaMap[comp.areaId].n += 1;
    }
  }

  const byCategory = Object.values(catMap);
  const byArea = Object.values(areaMap);
  const byWard = [
    { ward: "12", label: "Ward 12", ...wardStatsMap["12"] },
    { ward: "13", label: "Ward 13", ...wardStatsMap["13"] },
    { ward: "14", label: "Ward 14", ...wardStatsMap["14"] },
  ];

  return {
    totals: {
      total,
      new: statusMap.SUBMITTED ?? 0,
      verified: statusMap.VERIFIED ?? 0,
      assigned: statusMap.ASSIGNED ?? 0,
      forwarded: statusMap.FORWARDED ?? 0,
      inProgress: statusMap.IN_PROGRESS ?? 0,
      actionTaken: statusMap.ACTION_TAKEN ?? 0,
      resolved,
      rejected: statusMap.REJECTED ?? 0,
      duplicate: statusMap.DUPLICATE ?? 0,
      needsInfo: statusMap.NEEDS_INFORMATION ?? 0,
      open,
      closed: total - open,
      resolvedPercent: total ? Math.round((resolved / total) * 100) : 0,
      avgResolutionHours,
      totalUsers,
      pendingPosts,
      activeNotices,
      newThisWeek,
    },
    byStatus: Object.entries(statusMap).map(([status, n]) => ({ status: status as ComplaintStatus, n })),
    byCategory,
    byArea,
    byWard,
    monthly: [] as { month: string; n: number; resolved: number }[],
    recentNew,
  };
}
export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

export async function activeAdminsForAssignment() {
  const c = await collections();
  const rows = await c.admins
    .find({ isActive: true, role: { $in: ["SUPER_ADMIN", "COMPLAINT_ADMIN", "MODERATOR"] as AdminRole[] } })
    .sort({ name: 1 })
    .toArray();

  return rows.map((a) => ({ id: a.id, name: a.name, role: a.role, department: a.department ?? null }));
}

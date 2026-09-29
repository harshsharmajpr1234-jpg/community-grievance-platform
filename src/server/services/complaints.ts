import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { collections } from "@/db";
import type {
  Admin,
  Area,
  Complaint,
  ComplaintCategory,
  ComplaintDocument,
  User,
} from "@/db/schema";
import { ApiError } from "@/server/api";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { notifyComplaintUpdate } from "@/server/services/notifications";
import type {
  AdminRole,
  ComplaintPriority,
  ComplaintStatus,
  DocumentKind,
} from "@/shared/constants";
import { assertPermission } from "@/server/api";
import type { Permission } from "@/shared/rbac";
import type { AdminComplaintAction, CreateComplaintInput, ListQuery } from "@/shared/validation";

export type Viewer =
  | { kind: "public" }
  | { kind: "owner"; userId: string }
  | { kind: "admin"; admin: Admin; sensitive: boolean };

export type AdminContext = {
  admin: Admin;
  ip: string;
  userAgent?: string | null;
};

export function formatComplaintCode(year: number, seq: number): string {
  return `JSM-${year}-${String(seq).padStart(6, "0")}`;
}

export async function nextComplaintCode(): Promise<string> {
  const c = await collections();
  const year = new Date().getFullYear();
  const res = await c.counters.findOneAndUpdate(
    { key: `complaint_${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = res?.value ?? (await c.complaints.countDocuments()) + 1;
  return formatComplaintCode(year, seq);
}

// Memory caching for serverless cold-starts
let cachedCategories: { data: ComplaintCategory[]; expiresAt: number } | null = null;
let cachedAreas: { data: Area[]; expiresAt: number } | null = null;

export async function listCategories(includeInactive = false) {
  const now = Date.now();
  if (!includeInactive && cachedCategories && cachedCategories.expiresAt > now) {
    return cachedCategories.data;
  }
  const c = await collections();
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await c.complaintCategories.find(filter).sort({ sortOrder: 1, nameHi: 1 }).toArray();

  if (!includeInactive) {
    cachedCategories = { data: categories, expiresAt: now + 30000 };
  }
  return categories;
}

export async function listAreas(includeInactive = false) {
  const now = Date.now();
  if (!includeInactive && cachedAreas && cachedAreas.expiresAt > now) {
    return cachedAreas.data;
  }
  const c = await collections();
  const filter = includeInactive ? {} : { isActive: true };
  const areas = await c.areas.find(filter).sort({ sortOrder: 1, nameHi: 1 }).toArray();

  if (!includeInactive) {
    cachedAreas = { data: areas, expiresAt: now + 30000 };
  }
  return areas;
}

export function serializeComplaint(c: Complaint, category: ComplaintCategory | null, area: Area | null, viewer: Viewer) {
  const privileged = viewer.kind !== "public";
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    status: c.status,
    priority: c.priority,
    category: category
      ? { id: category.id, slug: category.slug, nameEn: category.nameEn, nameHi: category.nameHi, icon: category.icon }
      : null,
    area: area ? { id: area.id, name: area.name, nameHi: area.nameHi ?? null } : null,
    wardNumber: c.wardNumber ?? null,
    areaSource: (c.areaSource as "VERIFIED_AREA" | "USER_ENTERED") || "VERIFIED_AREA",
    manualAreaName: c.manualAreaName ?? null,
    address: privileged ? (c.address ?? null) : null,
    landmark: privileged ? (c.landmark ?? null) : null,
    latitude: privileged ? (c.latitude ?? null) : null,
    longitude: privileged ? (c.longitude ?? null) : null,
    contactPreference: privileged ? (c.contactPreference ?? "SMS") : null,
    department: c.department ?? null,
    forwardedTo: c.forwardedTo ?? null,
    isPublic: c.isPublic ?? true,
    isDemo: c.isDemo ?? false,
    duplicateOfId: c.duplicateOfId ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    lastUpdateAt: c.lastUpdateAt,
    resolvedAt: c.resolvedAt ?? null,
    closedAt: c.closedAt ?? null,
    ...(viewer.kind === "admin" ? { userId: c.userId, assignedAdminId: c.assignedAdminId ?? null, submittedIp: viewer.sensitive ? (c.submittedIp ?? null) : null } : {}),
  };
}

export function serializeDocument(d: ComplaintDocument) {
  const url = `/api/files/${encodeURIComponent(d.fileName || d.storedName || d.id)}`;
  return {
    id: d.id,
    kind: d.kind,
    fileName: d.fileName ?? d.storedName ?? d.id,
    originalName: d.originalName,
    mimeType: d.mimeType,
    fileSize: d.fileSize ?? d.sizeBytes ?? 0,
    sizeBytes: d.sizeBytes ?? d.fileSize ?? 0,
    isPublic: d.isPublic ?? true,
    createdAt: d.createdAt,
    downloadUrl: url,
    url,
  };
}

export function isComplaintCode(value: string) {
  return /^JSM-\d{4}-\d{6}$/i.test(value.trim());
}

export async function findComplaint(idOrCode: string) {
  const c = await collections();
  const q = isComplaintCode(idOrCode) ? { code: idOrCode.trim().toUpperCase() } : { id: idOrCode };
  const complaint = await c.complaints.findOne(q);
  if (!complaint) return null;

  const category = complaint.categoryId ? await c.complaintCategories.findOne({ id: complaint.categoryId }) : null;
  const area = complaint.areaId ? await c.areas.findOne({ id: complaint.areaId }) : null;
  return { complaint, category, area };
}

export async function getComplaintDetail(idOrCode: string, viewer: Viewer) {
  if (!isComplaintCode(idOrCode) && !/^[0-9a-f-]{36}$/i.test(idOrCode)) {
    throw new ApiError(404, "NOT_FOUND", "Complaint not found");
  }
  const row = await findComplaint(idOrCode);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Complaint not found");
  const c = row.complaint;

  const isOwner = viewer.kind === "owner" && viewer.userId === c.userId;
  const isAdmin = viewer.kind === "admin";
  if (!isOwner && !isAdmin && !c.isPublic) throw new ApiError(404, "NOT_FOUND", "Complaint not found");
  const effectiveViewer: Viewer = isOwner || isAdmin ? viewer : { kind: "public" };

  const dbCols = await collections();
  const [docs, updatesList, feedback, assigned, owner, duplicateOf] = await Promise.all([
    dbCols.complaintDocuments.find({ complaintId: c.id, ...(isAdmin || isOwner ? {} : { isPublic: true }) }).sort({ createdAt: 1 }).toArray(),
    dbCols.complaintUpdates.find({ complaintId: c.id, ...(isAdmin ? {} : { isPublic: true }) }).sort({ createdAt: 1 }).toArray(),
    isOwner || isAdmin ? dbCols.complaintFeedback.find({ complaintId: c.id }).sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
    isAdmin && c.assignedAdminId ? dbCols.admins.findOne({ id: c.assignedAdminId }) : Promise.resolve(null),
    isAdmin && viewer.kind === "admin" && viewer.sensitive ? dbCols.users.findOne({ id: c.userId }) : Promise.resolve(null),
    c.duplicateOfId ? dbCols.complaints.findOne({ id: c.duplicateOfId }) : Promise.resolve(null),
  ]);

  const updates = await Promise.all(
    updatesList.map(async (u) => {
      const adminObj = u.adminId ? await dbCols.admins.findOne({ id: u.adminId }) : null;
      const userObj = u.userId ? await dbCols.users.findOne({ id: u.userId }) : null;
      return {
        id: u.id,
        type: u.type,
        oldStatus: u.oldStatus ?? null,
        newStatus: u.newStatus ?? null,
        message: u.message ?? "",
        isPublic: u.isPublic ?? true,
        createdAt: u.createdAt,
        adminName: adminObj?.name || null,
        byAdmin: adminObj?.name || null,
        byUser: Boolean(u.userId),
      };
    })
  );

  return {
    ...serializeComplaint(c, row.category, row.area, effectiveViewer),
    isOwner,
    documents: docs.map(serializeDocument),
    updates,
    feedback: feedback.map((f) => ({ id: f.id, isResolved: f.isResolved, rating: f.rating ?? null, comment: f.comment ?? null, createdAt: f.createdAt })),
    assignedAdmin: assigned ? { id: assigned.id, name: assigned.name, department: assigned.department ?? null } : null,
    owner: owner ? { id: owner.id, name: owner.name, mobile: owner.mobile, email: owner.email ?? null, address: owner.address ?? null } : null,
    resident: owner ? { id: owner.id, name: owner.name, mobile: owner.mobile, email: owner.email ?? null, address: owner.address ?? null } : null,
    duplicateOf: duplicateOf ? { id: duplicateOf.id, code: duplicateOf.code } : null,
  };
}

export async function listPublicComplaints(q: ListQuery) {
  const c = await collections();
  const filter: any = { isPublic: true };

  if (q.q?.trim()) {
    const term = q.q.trim();
    filter.$or = [{ code: { $regex: term, $options: "i" } }, { title: { $regex: term, $options: "i" } }];
  }
  if (q.status) filter.status = q.status;
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.areaId) filter.areaId = q.areaId;
  if (q.priority) filter.priority = q.priority;

  const total = await c.complaints.countDocuments(filter);
  const skip = (q.page - 1) * q.pageSize;
  const items = await c.complaints.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.pageSize).toArray();

  const serialized = await Promise.all(
    items.map(async (item) => {
      const category = item.categoryId ? await c.complaintCategories.findOne({ id: item.categoryId }) : null;
      const area = item.areaId ? await c.areas.findOne({ id: item.areaId }) : null;
      return serializeComplaint(item, category, area, { kind: "public" });
    })
  );

  return { items: serialized, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function listUserComplaints(userId: string, q: ListQuery) {
  const c = await collections();
  const filter: any = { userId };

  if (q.q?.trim()) {
    const term = q.q.trim();
    filter.$or = [{ code: { $regex: term, $options: "i" } }, { title: { $regex: term, $options: "i" } }];
  }
  if (q.status) filter.status = q.status;
  if (q.categoryId) filter.categoryId = q.categoryId;

  const total = await c.complaints.countDocuments(filter);
  const skip = (q.page - 1) * q.pageSize;
  const items = await c.complaints.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.pageSize).toArray();

  const serialized = await Promise.all(
    items.map(async (item) => {
      const category = item.categoryId ? await c.complaintCategories.findOne({ id: item.categoryId }) : null;
      const area = item.areaId ? await c.areas.findOne({ id: item.areaId }) : null;
      return serializeComplaint(item, category, area, { kind: "owner", userId });
    })
  );

  return { items: serialized, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function adminListComplaints(q: ListQuery, admin: Admin, sensitive: boolean) {
  const c = await collections();
  const filter: any = {};

  if (q.q?.trim()) {
    const term = q.q.trim();
    filter.$or = [{ code: { $regex: term, $options: "i" } }, { title: { $regex: term, $options: "i" } }, { description: { $regex: term, $options: "i" } }];
  }
  if (q.status) filter.status = q.status;
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.areaId) filter.areaId = q.areaId;
  if (q.priority) filter.priority = q.priority;
  if (q.assignedAdminId) filter.assignedAdminId = q.assignedAdminId;
  if (q.wardNumber || (q as any).ward) {
    const rawWard = String(q.wardNumber || (q as any).ward).replace(/\D/g, "");
    if (rawWard) {
      filter.wardNumber = { $regex: rawWard, $options: "i" };
    }
  }

  const total = await c.complaints.countDocuments(filter);
  const skip = (q.page - 1) * q.pageSize;
  const items = await c.complaints.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.pageSize).toArray();

  const serialized = await Promise.all(
    items.map(async (item) => {
      const category = item.categoryId ? await c.complaintCategories.findOne({ id: item.categoryId }) : null;
      const area = item.areaId ? await c.areas.findOne({ id: item.areaId }) : null;
      return serializeComplaint(item, category, area, {
        kind: "admin",
        admin,
        sensitive,
      });
    })
  );

  return { items: serialized, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
}

export async function createComplaint(user: User, input: CreateComplaintInput, ip: string) {
  if (input.wardNumber !== "12" && input.wardNumber !== "13" && input.wardNumber !== "14") {
    throw new ApiError(400, "VALIDATION_ERROR", "केवल वार्ड 12, 13 या वार्ड 14 ही मान्य हैं। (Only Ward 12, Ward 13 or Ward 14 are allowed.)");
  }
  const perUser = rateLimit(`complaint:user:${user.id}`, LIMITS.complaintPerUser.limit, LIMITS.complaintPerUser.windowMs);
  const perIp = rateLimit(`complaint:ip:${ip}`, LIMITS.complaintPerIp.limit, LIMITS.complaintPerIp.windowMs);
  if (!perUser.allowed || !perIp.allowed) {
    throw new ApiError(429, "RATE_LIMITED", "Daily complaint limit reached. Please try again tomorrow.");
  }

  const c = await collections();
  const category = await c.complaintCategories.findOne({
    id: input.categoryId,
    $or: [{ isActive: true }, { isAvailable: true }, { isActive: { $ne: false } }],
  });
  if (!category) throw new ApiError(400, "VALIDATION_ERROR", "Invalid complaint category");

  if (input.areaId) {
    const area = await c.areas.findOne({ id: input.areaId });
    if (!area) throw new ApiError(400, "VALIDATION_ERROR", "Invalid locality");
  }

  const code = await nextComplaintCode();
  const now = new Date();
  const complaintId = randomUUID();

  if (input.name?.trim() && input.name.trim() !== user.name) {
    await c.users.updateOne({ id: user.id }, { $set: { name: input.name.trim(), updatedAt: now } });
  }

  const newComplaint: Complaint = {
    id: complaintId,
    code,
    userId: user.id,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    areaId: input.areaSource === "VERIFIED_AREA" ? (input.areaId ?? null) : null,
    wardNumber: input.wardNumber,
    areaSource: input.areaSource,
    manualAreaName: input.areaSource === "USER_ENTERED" ? (input.manualAreaName?.trim() || null) : null,
    address: input.address?.trim() || null,
    landmark: input.landmark?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    priority: input.priority || "MEDIUM",
    contactPreference: input.contactPreference || "SMS",
    status: "SUBMITTED",
    department: category.defaultDepartment || "Municipal Corporation / JDA",
    forwardedTo: null,
    assignedAdminId: null,
    duplicateOfId: null,
    isPublic: true,
    isDemo: false,
    submittedIp: ip,
    lastUpdateAt: now,
    resolvedAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await c.complaints.insertOne(newComplaint);

  await c.complaintUpdates.insertOne({
    id: randomUUID(),
    complaintId,
    adminId: null,
    userId: user.id,
    type: "STATUS_CHANGE",
    oldStatus: null,
    newStatus: "SUBMITTED",
    message: "शिकायत दर्ज की गई है। (Complaint registered)",
    isPublic: true,
    createdAt: now,
  });

  await c.notifications.insertOne({
    id: randomUUID(),
    userId: user.id,
    adminId: null,
    title: "Complaint registered",
    message: `Your complaint ${code} (${input.title}) has been registered.`,
    type: "COMPLAINT_SUBMITTED",
    referenceType: "complaint",
    referenceId: code,
    isRead: false,
    readAt: null,
    createdAt: now,
  });

  const areaObj = input.areaId ? await c.areas.findOne({ id: input.areaId }) : null;
  return {
    complaint: serializeComplaint(newComplaint, category, areaObj, { kind: "owner", userId: user.id }),
    possibleDuplicates: [],
  };
}

export async function trackComplaint(code: string, mobile: string, ip: string) {
  const perIp = rateLimit(`track:ip:${ip}`, LIMITS.trackPerIp.limit, LIMITS.trackPerIp.windowMs);
  if (!perIp.allowed) throw new ApiError(429, "RATE_LIMITED", "Too many tracking attempts. Try again later.");

  const c = await collections();
  const norm = mobile.replace(/\D/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");
  const user = await c.users.findOne({ mobile: norm });
  if (!user) throw new ApiError(404, "NOT_FOUND", "No matching complaint found for this mobile number and complaint ID.");

  const complaint = await c.complaints.findOne({ code: code.trim().toUpperCase(), userId: user.id });
  if (!complaint) throw new ApiError(404, "NOT_FOUND", "No matching complaint found for this mobile number and complaint ID.");

  return getComplaintDetail(complaint.id, { kind: "owner", userId: user.id });
}

export async function addUserResponse(user: User, idOrCode: string, message: string) {
  const c = await collections();
  const row = await findComplaint(idOrCode);
  if (!row || row.complaint.userId !== user.id) throw new ApiError(404, "NOT_FOUND", "Complaint not found");

  const now = new Date();
  await c.complaintUpdates.insertOne({
    id: randomUUID(),
    complaintId: row.complaint.id,
    adminId: null,
    userId: user.id,
    type: "USER_RESPONSE",
    oldStatus: null,
    newStatus: null,
    message: message.trim(),
    isPublic: true,
    createdAt: now,
  });

  await c.complaints.updateOne({ id: row.complaint.id }, { $set: { lastUpdateAt: now, updatedAt: now } });
  return getComplaintDetail(row.complaint.id, { kind: "owner", userId: user.id });
}

export async function submitFeedback(user: User, idOrCode: string, input: { isResolved: boolean; rating?: number; comment?: string }) {
  const c = await collections();
  const row = await findComplaint(idOrCode);
  if (!row || row.complaint.userId !== user.id) throw new ApiError(404, "NOT_FOUND", "Complaint not found");
  const comp = row.complaint;

  if (comp.status !== "RESOLVED" && comp.status !== "ACTION_TAKEN") {
    throw new ApiError(400, "VALIDATION_ERROR", "Feedback can only be submitted after action is taken or resolved.");
  }

  const now = new Date();
  await c.complaintFeedback.insertOne({
    id: randomUUID(),
    complaintId: comp.id,
    userId: user.id,
    isResolved: input.isResolved,
    rating: input.rating ?? null,
    comment: input.comment?.trim() || null,
    createdAt: now,
  });

  const newStatus = input.isResolved ? "CLOSED" : "IN_PROGRESS";
  await c.complaints.updateOne(
    { id: comp.id },
    { $set: { status: newStatus, ...(input.isResolved ? { closedAt: now } : {}), lastUpdateAt: now, updatedAt: now } }
  );

  await c.complaintUpdates.insertOne({
    id: randomUUID(),
    complaintId: comp.id,
    adminId: null,
    userId: user.id,
    type: "STATUS_CHANGE",
    oldStatus: comp.status,
    newStatus,
    message: input.isResolved ? "नागरिक फ़ीडबैक: समस्या हल हो गई। (Citizen confirmed resolution)" : "नागरिक फ़ीडबैक: समस्या अभी हल नहीं हुई। (Citizen reported issue persists)",
    isPublic: true,
    createdAt: now,
  });

  return getComplaintDetail(comp.id, { kind: "owner", userId: user.id });
}

const ACTION_PERMISSION: Record<AdminComplaintAction["action"], Permission> = {
  VERIFY: "complaints.verify",
  STATUS: "complaints.update_status",
  ASSIGN: "complaints.assign",
  FORWARD: "complaints.forward",
  NOTE: "complaints.note",
  PUBLIC_UPDATE: "complaints.public_update",
  REQUEST_INFO: "complaints.request_info",
  DUPLICATE: "complaints.duplicate",
  RESOLVE: "complaints.resolve",
  PRIORITY: "complaints.update_status",
  VISIBILITY: "complaints.update_status",
};

export async function applyAdminAction(ctx: AdminContext, idOrCode: string, action: AdminComplaintAction) {
  assertPermission(ctx.admin, ACTION_PERMISSION[action.action]);
  const c = await collections();
  const row = await findComplaint(idOrCode);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Complaint not found");
  const comp = row.complaint;
  const now = new Date();

  const patch: Partial<Complaint> = { lastUpdateAt: now, updatedAt: now };
  let newStatus: ComplaintStatus | null = null;
  let publicMessage: string | undefined;

  switch (action.action) {
    case "VERIFY":
      patch.status = "VERIFIED";
      newStatus = "VERIFIED";
      publicMessage = action.message || "शिकायत सत्यापित की गई। (Complaint verified)";
      break;
    case "STATUS":
      patch.status = action.status;
      newStatus = action.status;
      if (action.status === "RESOLVED") patch.resolvedAt = now;
      if (action.status === "CLOSED") patch.closedAt = now;
      publicMessage = action.message || `स्थिति अद्यतन: ${action.status}`;
      break;
    case "ASSIGN":
      patch.assignedAdminId = action.adminId;
      patch.status = "ASSIGNED";
      newStatus = "ASSIGNED";
      publicMessage = action.message || "शिकायत अधिकारी/टीम को सौंपी गई। (Assigned to department)";
      break;
    case "FORWARD":
      patch.forwardedTo = action.forwardedTo;
      patch.department = action.forwardedTo;
      patch.status = "FORWARDED";
      newStatus = "FORWARDED";
      publicMessage = action.message || `शिकायत ${action.forwardedTo} को अग्रेषित की गई।`;
      break;
    case "NOTE":
      publicMessage = action.message;
      break;
    case "RESOLVE":
      patch.status = "RESOLVED";
      patch.resolvedAt = now;
      newStatus = "RESOLVED";
      publicMessage = action.message || "शिकायत का समाधान कर दिया गया है।";
      break;
    case "PRIORITY":
      patch.priority = action.priority;
      publicMessage = `प्राथमिकता अद्यतन: ${action.priority}`;
      break;
  }

  await c.complaints.updateOne({ id: comp.id }, { $set: patch });

  await c.complaintUpdates.insertOne({
    id: randomUUID(),
    complaintId: comp.id,
    adminId: ctx.admin.id,
    userId: null,
    type: action.action === "NOTE" ? "INTERNAL_NOTE" : "STATUS_CHANGE",
    oldStatus: comp.status,
    newStatus: newStatus || comp.status,
    message: publicMessage || "",
    isPublic: true,
    createdAt: now,
  });

  const { recordAuditLog } = await import("@/server/services/audit");
  await recordAuditLog({
    adminId: ctx.admin.id,
    action: `complaint.${action.action.toLowerCase()}`,
    entityType: "complaint",
    entityId: comp.id,
    oldValue: { status: comp.status, priority: comp.priority },
    newValue: patch,
    ipAddress: ctx.ip,
  });

  if (newStatus) {
    await notifyComplaintUpdate(comp.userId, comp.code, newStatus, publicMessage);
  }

  return getComplaintDetail(comp.id, { kind: "admin", admin: ctx.admin, sensitive: true });
}

export async function publicStats() {
  const c = await collections();
  const [total, resolved, inProgress, pending, activeNotices] = await Promise.all([
    c.complaints.countDocuments({ isPublic: true }),
    c.complaints.countDocuments({ isPublic: true, status: { $in: ["RESOLVED", "CLOSED"] } }),
    c.complaints.countDocuments({ isPublic: true, status: { $in: ["IN_PROGRESS", "ACTION_TAKEN", "ASSIGNED", "FORWARDED"] } }),
    c.complaints.countDocuments({ isPublic: true, status: { $in: ["SUBMITTED", "NEEDS_INFORMATION"] } }),
    c.notices.countDocuments({ status: "PUBLISHED" }),
  ]);
  return { total, resolved, inProgress, pending, activeNotices };
}

export async function findSimilarComplaints(categoryId: string, areaId: string | undefined, title: string) {
  const c = await collections();
  const filter: any = { categoryId, isPublic: true, status: { $ne: "REJECTED" } };
  if (areaId) filter.areaId = areaId;
  const list = await c.complaints.find(filter).sort({ createdAt: -1 }).limit(10).toArray();
  const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return list
    .filter((comp) => {
      const compTitle = comp.title.toLowerCase();
      return words.some((w) => compTitle.includes(w));
    })
    .slice(0, 3)
    .map((comp) => ({
      id: comp.id,
      code: comp.code,
      title: comp.title,
      status: comp.status,
      createdAt: comp.createdAt,
    }));
}

export async function registerDocument(
  idOrCode: string,
  owner: { user: User },
  input: { kind: DocumentKind; storedName: string; originalName: string; mimeType: string; sizeBytes: number }
) {
  const c = await collections();
  const row = await findComplaint(idOrCode);
  if (!row || row.complaint.userId !== owner.user.id) throw new ApiError(404, "NOT_FOUND", "Complaint not found");

  const docId = randomUUID();
  const now = new Date();
  const doc: ComplaintDocument = {
    id: docId,
    complaintId: row.complaint.id,
    uploadedByUserId: owner.user.id,
    uploadedByAdminId: null,
    kind: input.kind,
    storedName: input.storedName,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    isPublic: true,
    createdAt: now,
  };
  await c.complaintDocuments.insertOne(doc);
  return serializeDocument(doc);
}

export async function documentByStoredName(storedName: string) {
  const c = await collections();
  const doc = await c.complaintDocuments.findOne({ storedName });
  if (!doc) return null;
  const comp = await c.complaints.findOne({ id: doc.complaintId });
  if (!comp) return null;
  return {
    doc,
    complaintPublic: comp.isPublic,
    complaintUserId: comp.userId,
  };
}

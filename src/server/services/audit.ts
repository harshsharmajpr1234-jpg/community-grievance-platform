import { randomUUID } from "node:crypto";
import { collections } from "@/db";
import type { AuditLog } from "@/db/schema";
import type { AdminContext } from "@/server/api";

export async function logAudit(
  ctx: AdminContext,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValue?: unknown,
  newValue?: unknown,
) {
  try {
    const c = await collections();
    await c.auditLogs.insertOne({
      id: randomUUID(),
      adminId: ctx.admin.id,
      adminEmail: ctx.admin.email,
      action,
      entityType,
      entityId,
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: newValue === undefined ? null : newValue,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

export async function recordAuditLog(params: {
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}) {
  try {
    const c = await collections();
    const admin = params.adminId ? await c.admins.findOne({ id: params.adminId }) : null;
    await c.auditLogs.insertOne({
      id: randomUUID(),
      adminId: params.adminId,
      adminEmail: admin?.email || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue === undefined ? null : params.oldValue,
      newValue: params.newValue === undefined ? null : params.newValue,
      ipAddress: params.ipAddress || null,
      userAgent: null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[audit] failed to record audit log", error);
  }
}

export async function listAuditLogs(opts: {
  page: number;
  pageSize: number;
  q?: string;
  entityType?: string;
  adminId?: string;
  from?: Date;
  to?: Date;
}) {
  const c = await collections();
  const filter: any = {};

  if (opts.q?.trim()) {
    const term = opts.q.trim();
    filter.$or = [
      { action: { $regex: term, $options: "i" } },
      { entityId: { $regex: term, $options: "i" } },
      { adminEmail: { $regex: term, $options: "i" } },
    ];
  }
  if (opts.entityType) filter.entityType = opts.entityType;
  if (opts.adminId) filter.adminId = opts.adminId;
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = opts.from;
    if (opts.to) filter.createdAt.$lte = opts.to;
  }

  const total = await c.auditLogs.countDocuments(filter);
  const skip = (opts.page - 1) * opts.pageSize;
  const items = await c.auditLogs.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.pageSize).toArray();

  const rows = await Promise.all(
    items.map(async (item) => {
      const admin = item.adminId ? await c.admins.findOne({ id: item.adminId }) : null;
      return { ...item, adminName: admin?.name || null };
    })
  );

  return { rows, total };
}

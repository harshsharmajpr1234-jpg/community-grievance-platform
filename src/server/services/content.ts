import { randomUUID } from "node:crypto";
import { z, type ZodType } from "zod";
import { collections } from "@/db";
import type { Area, Notice, DevelopmentProject, User, CommunityPost, ComplaintCategory } from "@/db/schema";
import { ApiError, type AdminContext } from "@/server/api";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import type { Permission } from "@/shared/rbac";
import {
  adminCommunityPostSchema,
  areaSchema,
  communityPostSchema,
  noticeSchema,
  projectSchema,
  serviceSchema,
} from "@/shared/validation";
import { logAudit } from "./audit";
import { notifyAdmins } from "./notifications";

export type Page = { page: number; pageSize: number };

/* ------------------------------------------------------------------ */
/* Notices                                                              */
/* ------------------------------------------------------------------ */
export async function listPublishedNotices(p: Page & { q?: string; category?: string; areaId?: string }) {
  const c = await collections();
  const now = new Date();
  const filter: any = {
    status: "PUBLISHED",
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  };

  if (p.q?.trim()) {
    const term = p.q.trim();
    filter.$or = [{ title: { $regex: term, $options: "i" } }, { content: { $regex: term, $options: "i" } }];
  }
  if (p.category) filter.category = p.category;

  const total = await c.notices.countDocuments(filter);
  const skip = (p.page - 1) * p.pageSize;
  const items = await c.notices.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(p.pageSize).toArray();

  return { rows: items, total };
}

export async function getPublishedNotice(id: string) {
  const c = await collections();
  const notice = await c.notices.findOne({ id, status: "PUBLISHED" });
  if (!notice) return null;
  return notice;
}

/* ------------------------------------------------------------------ */
/* Development projects                                                 */
/* ------------------------------------------------------------------ */
export async function listPublishedProjects(p: Page & { q?: string; status?: string }) {
  const c = await collections();
  const filter: any = {};
  if (p.q?.trim()) {
    const term = p.q.trim();
    filter.$or = [{ title: { $regex: term, $options: "i" } }, { description: { $regex: term, $options: "i" } }];
  }
  if (p.status) filter.status = p.status;

  const total = await c.developmentProjects.countDocuments(filter);
  const skip = (p.page - 1) * p.pageSize;
  const items = await c.developmentProjects.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(p.pageSize).toArray();

  const rows = await Promise.all(
    items.map(async (item) => {
      const area = item.areaId ? await c.areas.findOne({ id: item.areaId }) : null;
      return { ...item, area: area ? { id: area.id, name: area.name, nameHi: area.nameHi } : null };
    })
  );

  return { rows, total };
}

export async function getProjectWithUpdates(id: string, includeUnpublished = false) {
  const c = await collections();
  const project = await c.developmentProjects.findOne({ id });
  if (!project) return null;

  const area = project.areaId ? await c.areas.findOne({ id: project.areaId }) : null;
  return {
    ...project,
    area: area ? { id: area.id, name: area.name, nameHi: area.nameHi ?? null } : null,
    photos: project.photos || [],
    documents: project.documents || [],
    updates: project.updates || [],
  };
}

/* ------------------------------------------------------------------ */
/* Government services directory                                        */
/* ------------------------------------------------------------------ */
export async function listServices(p: Page & { q?: string; category?: string; includeInactive?: boolean }) {
  const db = await (await import("@/lib/mongodb")).getDb();
  const servicesCol = db.collection("government_services");

  const filter: any = {};
  if (!p.includeInactive) filter.isActive = true;
  if (p.q?.trim()) {
    const term = p.q.trim();
    filter.$or = [{ name: { $regex: term, $options: "i" } }, { nameHi: { $regex: term, $options: "i" } }];
  }
  if (p.category) filter.category = p.category;

  const total = await servicesCol.countDocuments(filter);
  const skip = (p.page - 1) * p.pageSize;
  const rows = await servicesCol.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(p.pageSize).toArray();

  return { rows, total };
}

/* ------------------------------------------------------------------ */
/* Community                                                            */
/* ------------------------------------------------------------------ */
export async function listCommunityPosts(p: Page & { type?: string; status?: string; q?: string; all?: boolean }) {
  const c = await collections();
  const filter: any = p.all ? (p.status ? { status: p.status } : {}) : { status: "APPROVED" };

  if (p.type) filter.type = p.type;
  if (p.q?.trim()) {
    const term = p.q.trim();
    filter.$or = [{ title: { $regex: term, $options: "i" } }, { content: { $regex: term, $options: "i" } }];
  }

  const total = await c.communityPosts.countDocuments(filter);
  const skip = (p.page - 1) * p.pageSize;
  const items = await c.communityPosts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(p.pageSize).toArray();

  const rows = await Promise.all(
    items.map(async (item) => {
      const author = item.userId ? await c.users.findOne({ id: item.userId }) : null;
      const area = item.areaId ? await c.areas.findOne({ id: item.areaId }) : null;
      return {
        ...item,
        authorName: author ? (author.name ? author.name.split(" ")[0] : "Resident") : "Resident",
        area: area ? { id: area.id, name: area.name, nameHi: area.nameHi } : null,
      };
    })
  );

  return { rows, total };
}

export async function createUserCommunityPost(user: User, input: z.infer<typeof communityPostSchema>) {
  const limit = rateLimit(`community:${user.id}`, LIMITS.communityPostPerUser.limit, LIMITS.communityPostPerUser.windowMs);
  if (!limit.allowed) throw new ApiError(429, "RATE_LIMITED", "You can submit up to 3 community posts per day.");

  const c = await collections();
  const now = new Date();
  const newPost: CommunityPost = {
    id: randomUUID(),
    userId: user.id,
    type: input.type as any,
    title: input.title,
    content: input.content,
    areaId: input.areaId ?? null,
    status: "PENDING",
    viewCount: 0,
    upvoteCount: 0,
    approvedByAdminId: null,
    createdAt: now,
    updatedAt: now,
  };

  await c.communityPosts.insertOne(newPost);
  await notifyAdmins(["SUPER_ADMIN", "CONTENT_ADMIN", "MODERATOR"], {
    title: "Community post awaiting approval",
    message: newPost.title,
    type: "COMMUNITY",
    referenceType: "community_post",
    referenceId: newPost.id,
  });

  return newPost;
}

/* ------------------------------------------------------------------ */
/* Areas (hierarchy)                                                    */
/* ------------------------------------------------------------------ */
export type AreaNode = Area & { children: AreaNode[] };
export function buildAreaTree(rows: Area[]): AreaNode[] {
  const map = new Map<string, AreaNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: AreaNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

/* ------------------------------------------------------------------ */
/* Generic admin content registry                                       */
/* ------------------------------------------------------------------ */
const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
  nameEn: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(16).optional(),
  defaultDepartment: z.string().trim().max(150).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type ContentType = "notices" | "development" | "services" | "community" | "areas" | "categories";

type Registry = {
  permission: Permission;
  entityType: string;
  schema: ZodType<any>;
  list: (p: Page & { q?: string; status?: string; category?: string; type?: string }) => Promise<{ rows: unknown[]; total: number }>;
  get: (id: string) => Promise<unknown | null>;
  create: (data: Record<string, unknown>, ctx: AdminContext) => Promise<{ id: string }>;
  update: (id: string, data: Record<string, unknown>, ctx: AdminContext) => Promise<{ id: string }>;
  remove: (id: string, ctx: AdminContext) => Promise<void>;
};

export const contentRegistry: Record<ContentType, Registry> = {
  notices: {
    permission: "notices.manage",
    entityType: "notice",
    schema: noticeSchema,
    async list(p) {
      return listPublishedNotices(p);
    },
    async get(id) {
      const c = await collections();
      return c.notices.findOne({ id });
    },
    async create(data, ctx) {
      const input = noticeSchema.parse(data);
      const c = await collections();
      const now = new Date();
      const newNotice: Notice = {
        id: randomUUID(),
        title: input.title,
        titleHi: input.titleHi ?? null,
        description: input.description,
        descriptionHi: input.descriptionHi ?? null,
        category: input.category as any,
        priority: input.priority || "MEDIUM",
        status: input.status || "DRAFT",
        isPinned: input.isPinned ?? false,
        publishDate: input.publishDate ?? now,
        expiryDate: input.expiryDate ?? null,
        createdByAdminId: ctx?.admin?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await c.notices.insertOne(newNotice);
      await logAudit(ctx, "notice.create", "notice", newNotice.id, null, input);
      return newNotice;
    },
    async update(id, data, ctx) {
      const input = noticeSchema.partial().parse(data);
      const c = await collections();
      const old = await c.notices.findOne({ id });
      if (!old) throw new ApiError(404, "NOT_FOUND", "Notice not found");
      const patch: Partial<Notice> = { ...input, updatedAt: new Date() } as any;
      await c.notices.updateOne({ id }, { $set: patch });
      const updated = { ...old, ...patch };
      await logAudit(ctx, "notice.update", "notice", id, old, input);
      return updated;
    },
    async remove(id, ctx) {
      const c = await collections();
      await c.notices.deleteOne({ id });
      await logAudit(ctx, "notice.delete", "notice", id);
    },
  },
  development: {
    permission: "development.manage",
    entityType: "development_project",
    schema: projectSchema,
    async list(p) {
      return listPublishedProjects(p);
    },
    async get(id) {
      return getProjectWithUpdates(id, true);
    },
    async create(data, ctx) {
      const input = projectSchema.parse(data);
      const c = await collections();
      const now = new Date();
      const newProject: DevelopmentProject = {
        id: randomUUID(),
        name: input.name,
        nameHi: input.nameHi ?? null,
        description: input.description,
        location: input.location ?? "",
        areaId: input.areaId ?? null,
        department: input.department ?? "",
        startDate: input.startDate ?? null,
        expectedCompletion: input.expectedCompletion ?? null,
        status: input.status,
        progress: input.progress,
        sourceNote: input.sourceNote ?? null,
        isPublished: input.isPublished ?? true,
        createdAt: now,
        updatedAt: now,
      };
      await c.developmentProjects.insertOne(newProject);
      await logAudit(ctx, "project.create", "development_project", newProject.id, null, input);
      return newProject;
    },
    async update(id, data, ctx) {
      const input = projectSchema.partial().parse(data);
      const c = await collections();
      const old = await c.developmentProjects.findOne({ id });
      if (!old) throw new ApiError(404, "NOT_FOUND", "Project not found");
      const patch: Partial<DevelopmentProject> = { ...input, updatedAt: new Date() } as any;
      await c.developmentProjects.updateOne({ id }, { $set: patch });
      const updated = { ...old, ...patch };
      await logAudit(ctx, "project.update", "development_project", id, { status: old.status }, input);
      return updated;
    },
    async remove(id, ctx) {
      const c = await collections();
      await c.developmentProjects.deleteOne({ id });
      await logAudit(ctx, "project.delete", "development_project", id);
    },
  },
  services: {
    permission: "services.manage",
    entityType: "government_service",
    schema: serviceSchema,
    async list(p) {
      return listServices({ ...p, includeInactive: true });
    },
    async get(id) {
      const db = await (await import("@/lib/mongodb")).getDb();
      return db.collection("government_services").findOne({ id });
    },
    async create(data, ctx) {
      const input = serviceSchema.parse(data);
      const db = await (await import("@/lib/mongodb")).getDb();
      const newService = { id: randomUUID(), ...input, createdAt: new Date(), updatedAt: new Date() };
      await db.collection("government_services").insertOne(newService);
      await logAudit(ctx, "service.create", "government_service", newService.id, null, input);
      return newService;
    },
    async update(id, data, ctx) {
      const input = serviceSchema.partial().parse(data);
      const db = await (await import("@/lib/mongodb")).getDb();
      const res = await db.collection("government_services").updateOne({ id }, { $set: { ...input, updatedAt: new Date() } });
      if (res.matchedCount === 0) throw new ApiError(404, "NOT_FOUND", "Service not found");
      await logAudit(ctx, "service.update", "government_service", id, null, input);
      return { id };
    },
    async remove(id, ctx) {
      const db = await (await import("@/lib/mongodb")).getDb();
      await db.collection("government_services").deleteOne({ id });
      await logAudit(ctx, "service.delete", "government_service", id);
    },
  },
  community: {
    permission: "community.manage",
    entityType: "community_post",
    schema: adminCommunityPostSchema,
    async list(p) {
      return listCommunityPosts({ ...p, all: true });
    },
    async get(id) {
      const c = await collections();
      return c.communityPosts.findOne({ id });
    },
    async create(data, ctx) {
      const input = adminCommunityPostSchema.parse(data);
      const c = await collections();
      const now = new Date();
      const newPost: CommunityPost = {
        id: randomUUID(),
        userId: ctx.admin.id,
        type: input.type as any,
        title: input.title,
        content: input.content,
        areaId: input.areaId ?? null,
        status: input.status || "APPROVED",
        viewCount: 0,
        upvoteCount: 0,
        approvedByAdminId: ctx.admin.id,
        createdAt: now,
        updatedAt: now,
      };
      await c.communityPosts.insertOne(newPost);
      await logAudit(ctx, "community.create", "community_post", newPost.id, null, input);
      return newPost;
    },
    async update(id, data, ctx) {
      const input = adminCommunityPostSchema.partial().parse(data);
      const c = await collections();
      const old = await c.communityPosts.findOne({ id });
      if (!old) throw new ApiError(404, "NOT_FOUND", "Post not found");
      const patch: Partial<CommunityPost> = {
        ...input,
        ...(input.status ? { approvedByAdminId: ctx.admin.id } : {}),
        updatedAt: new Date(),
      } as any;
      await c.communityPosts.updateOne({ id }, { $set: patch });
      const updated = { ...old, ...patch };
      await logAudit(ctx, input.status && input.status !== old.status ? `community.${input.status.toLowerCase()}` : "community.update", "community_post", id, { status: old.status }, input);
      return updated;
    },
    async remove(id, ctx) {
      const c = await collections();
      await c.communityPosts.deleteOne({ id });
      await logAudit(ctx, "community.delete", "community_post", id);
    },
  },
  areas: {
    permission: "areas.manage",
    entityType: "area",
    schema: areaSchema,
    async list(p) {
      const c = await collections();
      const filter: any = {};
      if (p.q?.trim()) {
        const term = p.q.trim();
        filter.$or = [{ name: { $regex: term, $options: "i" } }, { nameHi: { $regex: term, $options: "i" } }];
      }
      if (p.type) filter.type = p.type;
      const rows = await c.areas.find(filter).sort({ sortOrder: 1, name: 1 }).limit(500).toArray();
      return { rows, total: rows.length };
    },
    async get(id) {
      const c = await collections();
      return c.areas.findOne({ id });
    },
    async create(data, ctx) {
      const input = areaSchema.parse(data);
      const c = await collections();
      const now = new Date();
      const newArea: Area = {
        id: randomUUID(),
        name: input.name,
        nameHi: input.nameHi ?? null,
        type: input.type as any,
        parentId: input.parentId ?? null,
        wardNumber: null,
        description: null,
        isActive: true,
        sortOrder: input.sortOrder ?? 0,
        createdAt: now,
      };
      await c.areas.insertOne(newArea);
      await logAudit(ctx, "area.create", "area", newArea.id, null, input);
      return newArea;
    },
    async update(id, data, ctx) {
      const input = areaSchema.partial().parse(data);
      if (input.parentId === id) throw new ApiError(400, "VALIDATION_ERROR", "An area cannot be its own parent");
      const c = await collections();
      const res = await c.areas.updateOne({ id }, { $set: { ...input, updatedAt: new Date() } as any });
      if (res.matchedCount === 0) throw new ApiError(404, "NOT_FOUND", "Area not found");
      await logAudit(ctx, "area.update", "area", id, null, input);
      return { id };
    },
    async remove(id, ctx) {
      const c = await collections();
      const childrenCount = await c.areas.countDocuments({ parentId: id });
      if (childrenCount > 0) throw new ApiError(400, "HAS_CHILDREN", "Remove or move child areas first");
      await c.areas.deleteOne({ id });
      await logAudit(ctx, "area.delete", "area", id);
    },
  },
  categories: {
    permission: "settings.manage",
    entityType: "complaint_category",
    schema: categorySchema,
    async list(p) {
      const c = await collections();
      const filter: any = {};
      if (p.q?.trim()) {
        const term = p.q.trim();
        filter.$or = [{ nameEn: { $regex: term, $options: "i" } }, { nameHi: { $regex: term, $options: "i" } }];
      }
      const rows = await c.complaintCategories.find(filter).sort({ sortOrder: 1 }).toArray();
      return { rows, total: rows.length };
    },
    async get(id) {
      const c = await collections();
      return c.complaintCategories.findOne({ id });
    },
    async create(data, ctx) {
      const input = categorySchema.parse(data);
      const c = await collections();
      const now = new Date();
      const newCat: ComplaintCategory = {
        id: randomUUID(),
        slug: input.slug,
        nameEn: input.nameEn,
        nameHi: input.nameHi,
        icon: input.icon ?? null,
        defaultDepartment: input.defaultDepartment ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      await c.complaintCategories.insertOne(newCat);
      await logAudit(ctx, "category.create", "complaint_category", newCat.id, null, input);
      return newCat;
    },
    async update(id, data, ctx) {
      const input = categorySchema.partial().parse(data);
      const c = await collections();
      const res = await c.complaintCategories.updateOne({ id }, { $set: { ...input, updatedAt: new Date() } as any });
      if (res.matchedCount === 0) throw new ApiError(404, "NOT_FOUND", "Category not found");
      await logAudit(ctx, "category.update", "complaint_category", id, null, input);
      return { id };
    },
    async remove(id, ctx) {
      const c = await collections();
      await c.complaintCategories.updateOne({ id }, { $set: { isActive: false, updatedAt: new Date() } });
      await logAudit(ctx, "category.deactivate", "complaint_category", id);
    },
  },
};

export function isContentType(value: string): value is ContentType {
  return value in contentRegistry;
}

export async function contentCounts() {
  const c = await collections();
  const [pendingPosts, activeNotices, projects] = await Promise.all([
    c.communityPosts.countDocuments({ status: "PENDING" }),
    c.notices.countDocuments({ status: "PUBLISHED" }),
    c.developmentProjects.countDocuments(),
  ]);
  return { pendingPosts, activeNotices, projects };
}

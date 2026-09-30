import { getDb, getCollection, pingDatabase } from "@/lib/mongodb";
import { getInMemoryDb } from "@/lib/memory-db";
import type {
  User,
  Admin,
  ComplaintCategory,
  Area,
  Complaint,
  ComplaintUpdate,
  ComplaintDocument,
  ComplaintFeedback,
  Notification,
  Notice,
  DevelopmentProject,
  CommunityPost,
  AuditLog,
  SystemSetting,
  PasswordResetToken,
  GovernmentService,
  Counter,
} from "./schema";

export { getDb, getCollection, pingDatabase };

let autoSeeded = false;

function isDbConnError(err: any): boolean {
  if (!err) return false;
  const errCode = String(err?.code || err?.cause?.code || "");
  const errName = String(err?.name || err?.constructor?.name || "").toLowerCase();
  const errMsg = String(err?.message || err || "").toLowerCase();
  const errFull = `${errName} ${errMsg} ${String(err).toLowerCase()}`;

  return (
    errCode === "ECONNREFUSED" ||
    errCode === "ETIMEDOUT" ||
    errCode === "ENOTFOUND" ||
    errFull.includes("mongonetworkerror") ||
    errFull.includes("mongoserverselectionerror") ||
    errFull.includes("mongotopologyclosederror") ||
    errFull.includes("mongodrivererror") ||
    errFull.includes("mongoservererror") ||
    errFull.includes("mongoerror") ||
    errFull.includes("server selection timed out") ||
    errFull.includes("econnrefused") ||
    errFull.includes("etimedout") ||
    errFull.includes("enotfound") ||
    errFull.includes("connection terminated") ||
    errFull.includes("connection timeout") ||
    errFull.includes("configuration_error") ||
    errFull.includes("could not connect to any servers") ||
    errFull.includes("topology is closed")
  );
}

function createResilientCollection<T extends Record<string, any>>(name: string) {
  const memColl = getInMemoryDb().collection<T>(name);

  async function execute<R>(action: (coll: any) => Promise<R>): Promise<R> {
    if ((globalThis as any)._isUsingMemoryFallback) {
      return action(memColl);
    }
    try {
      const realDb = await getDb();
      if ((globalThis as any)._isUsingMemoryFallback) {
        return action(memColl);
      }
      const realColl = realDb.collection(name);
      return await action(realColl);
    } catch (err: any) {
      if (isDbConnError(err)) {
        console.warn(`[db] MongoDB query error on '${name}'. Failover to in-memory store.`, err?.message || err);
        (globalThis as any)._isUsingMemoryFallback = true;
        return action(memColl);
      }
      throw err;
    }
  }

  return {
    createIndex(keys: any, opts?: any) {
      return execute((c) => c.createIndex(keys, opts));
    },
    findOne(filter?: any, opts?: any): Promise<T | null> {
      return execute<T | null>((c) => c.findOne(filter, opts));
    },
    find(filter?: any, opts?: any) {
      let sortObj: any = null;
      let skipVal: number | null = null;
      let limitVal: number | null = null;

      const cursorWrapper = {
        sort(s: any) {
          sortObj = s;
          return cursorWrapper;
        },
        skip(s: number) {
          skipVal = s;
          return cursorWrapper;
        },
        limit(l: number) {
          limitVal = l;
          return cursorWrapper;
        },
        async toArray(): Promise<T[]> {
          return execute(async (c) => {
            let cur = c.find(filter, opts);
            if (sortObj && cur.sort) cur = cur.sort(sortObj);
            if (skipVal !== null && cur.skip) cur = cur.skip(skipVal);
            if (limitVal !== null && cur.limit) cur = cur.limit(limitVal);
            return cur.toArray();
          });
        },
        async *[Symbol.asyncIterator]() {
          const items = await this.toArray();
          for (const item of items) {
            yield item;
          }
        },
      };
      return cursorWrapper;
    },
    insertOne(doc: T): Promise<any> {
      return execute<any>((c) => c.insertOne(doc));
    },
    insertMany(docs: T[]): Promise<any> {
      return execute<any>((c) => c.insertMany(docs));
    },
    updateOne(filter: any, update: any, opts?: any): Promise<any> {
      return execute<any>((c) => c.updateOne(filter, update, opts));
    },
    updateMany(filter: any, update: any, opts?: any): Promise<any> {
      return execute<any>((c) => c.updateMany(filter, update, opts));
    },
    findOneAndUpdate(filter: any, update: any, opts?: any): Promise<any> {
      return execute<any>((c) => c.findOneAndUpdate(filter, update, opts));
    },
    deleteOne(filter: any, opts?: any): Promise<any> {
      return execute<any>((c) => c.deleteOne(filter, opts));
    },
    deleteMany(filter: any, opts?: any): Promise<any> {
      return execute<any>((c) => c.deleteMany(filter, opts));
    },
    countDocuments(filter?: any, opts?: any): Promise<number> {
      return execute<number>((c) => c.countDocuments(filter, opts));
    },
  };
}

export async function collections() {
  if (!autoSeeded) {
    autoSeeded = true;
    import("./seed")
      .then((m) => m.seedIfEmpty())
      .catch((err) => console.error("[db] Auto-seed warning:", err));
  }
  return {
    users: createResilientCollection<User>("users"),
    admins: createResilientCollection<Admin>("admins"),
    complaintCategories: createResilientCollection<ComplaintCategory>("complaint_categories"),
    areas: createResilientCollection<Area>("areas"),
    complaints: createResilientCollection<Complaint>("complaints"),
    complaintUpdates: createResilientCollection<ComplaintUpdate>("complaint_updates"),
    complaintDocuments: createResilientCollection<ComplaintDocument>("complaint_documents"),
    complaintFeedback: createResilientCollection<ComplaintFeedback>("complaint_feedback"),
    notifications: createResilientCollection<Notification>("notifications"),
    notices: createResilientCollection<Notice>("notices"),
    developmentProjects: createResilientCollection<DevelopmentProject>("development_projects"),
    communityPosts: createResilientCollection<CommunityPost>("community_posts"),
    auditLogs: createResilientCollection<AuditLog>("audit_logs"),
    systemSettings: createResilientCollection<SystemSetting>("system_settings"),
    passwordResetTokens: createResilientCollection<PasswordResetToken>("password_reset_tokens"),
    governmentServices: createResilientCollection<GovernmentService>("government_services"),
    counters: createResilientCollection<Counter>("counters"),
  };
}

let indexesCreated = false;

export async function ensureIndexes() {
  if (indexesCreated) return;
  try {
    const c = await collections();
    await Promise.all([
      c.users.createIndex({ id: 1 }, { unique: true }),
      c.users.createIndex({ mobile: 1 }, { unique: true }),
      c.users.createIndex({ email: 1 }, { unique: true, sparse: true }),
      c.admins.createIndex({ id: 1 }, { unique: true }),
      c.admins.createIndex({ email: 1 }, { unique: true }),
      c.complaintCategories.createIndex({ id: 1 }, { unique: true }),
      c.complaintCategories.createIndex({ slug: 1 }, { unique: true }),
      c.areas.createIndex({ id: 1 }, { unique: true }),
      c.areas.createIndex({ code: 1 }, { unique: true }),
      c.complaints.createIndex({ id: 1 }, { unique: true }),
      c.complaints.createIndex({ code: 1 }, { unique: true }),
      c.complaints.createIndex({ userId: 1 }),
      c.complaints.createIndex({ status: 1 }),
      c.complaints.createIndex({ categoryId: 1 }),
      c.complaints.createIndex({ wardNumber: 1 }),
      c.complaints.createIndex({ createdAt: -1 }),
      c.complaintUpdates.createIndex({ complaintId: 1 }),
      c.complaintDocuments.createIndex({ complaintId: 1 }),
      c.notifications.createIndex({ userId: 1 }),
      c.notifications.createIndex({ createdAt: -1 }),
      c.notices.createIndex({ slug: 1 }, { unique: true }),
      c.notices.createIndex({ status: 1 }),
      c.auditLogs.createIndex({ entityId: 1 }),
      c.auditLogs.createIndex({ createdAt: -1 }),
    ]);
    indexesCreated = true;
  } catch (err) {
    console.error("[db] Index creation warning:", err);
  }
}

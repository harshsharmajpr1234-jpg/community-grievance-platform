import { getDb, getCollection, pingDatabase } from "@/lib/mongodb";
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

export async function collections() {
  const db = await getDb();
  if (!autoSeeded) {
    autoSeeded = true;
    import("./seed")
      .then((m) => m.seedIfEmpty())
      .catch((err) => console.error("[db] Auto-seed warning:", err));
  }
  return {
    users: db.collection<User>("users"),
    admins: db.collection<Admin>("admins"),
    complaintCategories: db.collection<ComplaintCategory>("complaint_categories"),
    areas: db.collection<Area>("areas"),
    complaints: db.collection<Complaint>("complaints"),
    complaintUpdates: db.collection<ComplaintUpdate>("complaint_updates"),
    complaintDocuments: db.collection<ComplaintDocument>("complaint_documents"),
    complaintFeedback: db.collection<ComplaintFeedback>("complaint_feedback"),
    notifications: db.collection<Notification>("notifications"),
    notices: db.collection<Notice>("notices"),
    developmentProjects: db.collection<DevelopmentProject>("development_projects"),
    communityPosts: db.collection<CommunityPost>("community_posts"),
    auditLogs: db.collection<AuditLog>("audit_logs"),
    systemSettings: db.collection<SystemSetting>("system_settings"),
    passwordResetTokens: db.collection<PasswordResetToken>("password_reset_tokens"),
    governmentServices: db.collection<GovernmentService>("government_services"),
    counters: db.collection<Counter>("counters"),
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

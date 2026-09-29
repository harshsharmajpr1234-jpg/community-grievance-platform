import { z } from "zod";
import {
  ADMIN_ROLES,
  AREA_TYPES,
  COMMUNITY_POST_STATUSES,
  COMMUNITY_POST_TYPES,
  COMPLAINT_CODE_REGEX,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  CONTACT_PREFERENCES,
  MOBILE_REGEX,
  NOTICE_CATEGORIES,
  NOTICE_STATUSES,
  PROJECT_STATUSES,
  SERVICE_CATEGORIES,
} from "./constants";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid id");
export const optionalUuid = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  uuidSchema.optional(),
);
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(MOBILE_REGEX, "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।"));

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().trim().max(max).optional());
const optionalUrl = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().trim().url().max(500).optional(),
);
const optionalDate = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}, z.date().optional());
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().finite().optional(),
);
const boolish = z.preprocess((v) => {
  if (typeof v === "string") return v === "true" || v === "1" || v === "on";
  return v;
}, z.boolean());

/* ---------------- Auth (residents) ---------------- */
export const profileUpdateSchema = z.object({
  name: optionalText(120),
  email: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().trim().toLowerCase().email().max(190).optional()),
  areaId: optionalUuid,
  address: optionalText(300),
  language: z.enum(["hi", "en"]).optional(),
});

/* ---------------- Complaints (resident) ---------------- */
export const createComplaintSchema = z
  .object({
    name: optionalText(120),
    mobile: mobileSchema.optional(),
    wardNumber: z.preprocess(
      (v) => (v === undefined || v === null || v === "" ? undefined : String(v).trim().replace(/^(ward\s*)/i, "")),
      z.enum(["12", "13", "14"], { message: "केवल वार्ड 12, 13 या वार्ड 14 ही मान्य हैं। (Only Ward 12, Ward 13 or Ward 14 are allowed.)" })
    ),
    areaId: optionalUuid,
    areaSource: z.enum(["VERIFIED_AREA", "USER_ENTERED"]).default("USER_ENTERED"),
    manualAreaName: optionalText(150),
    categoryId: uuidSchema,
    title: trimmed(5, 200),
    description: trimmed(20, 5000),
    wardId: optionalUuid,
    address: trimmed(5, 300),
    landmark: optionalText(150),
    latitude: optionalNumber.pipe(z.number().min(-90).max(90).optional()),
    longitude: optionalNumber.pipe(z.number().min(-180).max(180).optional()),
    priority: z.enum(COMPLAINT_PRIORITIES).default("MEDIUM"),
    contactPreference: z.enum(CONTACT_PREFERENCES).default("SMS"),
  })
  .superRefine((val, ctx) => {
    if (val.areaSource === "USER_ENTERED" && (!val.manualAreaName || val.manualAreaName.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "अपना क्षेत्र, कॉलोनी या मोहल्ले का नाम लिखें",
        path: ["manualAreaName"],
      });
    }
  });
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const trackComplaintSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(COMPLAINT_CODE_REGEX, "Complaint ID looks like DPF-2026-000001"),
  mobile: mobileSchema,
});

export const feedbackSchema = z.object({
  isResolved: boolish,
  rating: optionalNumber.pipe(z.number().int().min(1).max(5).optional()),
  comment: optionalText(1000),
});

export const userResponseSchema = z.object({ message: trimmed(3, 2000) });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: optionalText(120),
  status: z.preprocess((v) => (v === "" ? undefined : v), z.enum(COMPLAINT_STATUSES).optional()),
  categoryId: optionalUuid,
  areaId: optionalUuid,
  wardNumber: z.preprocess((v) => (v === "" || v === null ? undefined : String(v).trim()), z.string().optional()),
  ward: z.preprocess((v) => (v === "" || v === null ? undefined : String(v).trim()), z.string().optional()),
  priority: z.preprocess((v) => (v === "" ? undefined : v), z.enum(COMPLAINT_PRIORITIES).optional()),
  assignedAdminId: optionalUuid,
  from: optionalDate,
  to: optionalDate,
  mine: z.preprocess((v) => v === "true" || v === "1" || v === true, z.boolean()).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/* ---------------- Admin auth ---------------- */
export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(1).max(200),
  totp: optionalText(8),
});
export const strongPassword = z
  .string()
  .min(4, "कम से कम 4 अक्षर का पासवर्ड दर्ज करें।")
  .max(200);
export const adminSetupSchema = z.object({
  name: trimmed(2, 120),
  email: z.string().trim().toLowerCase().email().max(190),
  password: strongPassword,
  setupToken: optionalText(200),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: strongPassword,
});
export const twoFactorSchema = z.object({
  action: z.enum(["SETUP", "ENABLE", "DISABLE"]),
  code: optionalText(8),
});

export const registerSchema = z
  .object({
    name: trimmed(2, 120),
    mobile: mobileSchema,
    email: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().trim().toLowerCase().email().max(190).optional()),
    password: strongPassword,
    confirmPassword: z.string().min(1).max(200),
    ward: z.preprocess(
      (v) => {
        if (typeof v === "string" || typeof v === "number") {
          const str = String(v).trim();
          if (str.includes("12")) return "Ward 12";
          if (str.includes("13")) return "Ward 13";
          if (str.includes("14")) return "Ward 14";
        }
        return v;
      },
      z.enum(["Ward 12", "Ward 13", "Ward 14"], { message: "कृपया अपना वार्ड चुनें (Ward 12, Ward 13 या Ward 14)।" })
    ),
    address: optionalText(300),
    acceptTerms: z.preprocess((v) => (v === true || v === "true" || v === "on" || v === "1" ? true : v), z.literal(true, { message: "You must accept the Terms & Privacy Policy" })),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

/** Login with mobile number OR email + password. */
export const loginSchema = z.object({
  identifier: trimmed(3, 190),
  password: z.string().min(1).max(200),
});

/** Email-based password reset request. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
});

/** Single-use reset token + new password. */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(128),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1).max(200),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

/* ---------------- Admin complaint actions ---------------- */
export const adminComplaintActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VERIFY"), message: optionalText(2000) }),
  z.object({
    action: z.literal("STATUS"),
    status: z.enum(COMPLAINT_STATUSES),
    message: optionalText(2000),
    isPublic: boolish.default(true),
  }),
  z.object({
    action: z.literal("ASSIGN"),
    adminId: optionalUuid,
    department: optionalText(150),
    message: optionalText(2000),
  }),
  z.object({ action: z.literal("FORWARD"), forwardedTo: trimmed(2, 200), message: optionalText(2000) }),
  z.object({ action: z.literal("NOTE"), message: trimmed(2, 2000) }),
  z.object({ action: z.literal("PUBLIC_UPDATE"), message: trimmed(2, 2000) }),
  z.object({ action: z.literal("REQUEST_INFO"), message: trimmed(2, 2000) }),
  z.object({
    action: z.literal("DUPLICATE"),
    duplicateOfCode: z.string().trim().toUpperCase().regex(COMPLAINT_CODE_REGEX),
    message: optionalText(2000),
  }),
  z.object({ action: z.literal("RESOLVE"), message: optionalText(2000) }),
  z.object({ action: z.literal("PRIORITY"), priority: z.enum(COMPLAINT_PRIORITIES) }),
  z.object({ action: z.literal("VISIBILITY"), isPublic: boolish }),
]);
export type AdminComplaintAction = z.infer<typeof adminComplaintActionSchema>;

/* ---------------- Content ---------------- */
export const noticeSchema = z.object({
  title: trimmed(3, 200),
  titleHi: optionalText(200),
  description: trimmed(3, 10000),
  descriptionHi: optionalText(10000),
  category: z.enum(NOTICE_CATEGORIES),
  imageUrl: optionalUrl,
  attachmentUrl: optionalUrl,
  publishDate: optionalDate,
  expiryDate: optionalDate,
  priority: z.enum(COMPLAINT_PRIORITIES).default("MEDIUM"),
  areaId: optionalUuid,
  status: z.enum(NOTICE_STATUSES).default("DRAFT"),
  isPinned: boolish.default(false),
});

export const projectSchema = z.object({
  name: trimmed(3, 200),
  nameHi: optionalText(200),
  description: trimmed(3, 10000),
  location: optionalText(250),
  areaId: optionalUuid,
  department: optionalText(150),
  startDate: optionalDate,
  expectedCompletion: optionalDate,
  status: z.enum(PROJECT_STATUSES).default("PLANNED"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  photos: z.array(z.string().url().max(500)).max(12).default([]),
  documents: z.array(z.object({ name: z.string().max(120), url: z.string().url().max(500) })).max(12).default([]),
  sourceNote: optionalText(500),
  isPublished: boolish.default(false),
  updateMessage: optionalText(2000),
});

export const serviceSchema = z.object({
  name: trimmed(2, 200),
  nameHi: optionalText(200),
  department: trimmed(2, 150),
  category: z.enum(SERVICE_CATEGORIES),
  description: optionalText(2000),
  phone: optionalText(60),
  website: optionalUrl,
  address: optionalText(400),
  workingHours: optionalText(120),
  notes: optionalText(1000),
  isOfficial: boolish.default(true),
  isEmergency: boolish.default(false),
  isActive: boolish.default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const communityPostSchema = z.object({
  title: trimmed(3, 200),
  content: trimmed(10, 5000),
  type: z.enum(COMMUNITY_POST_TYPES),
  eventDate: optionalDate,
  location: optionalText(250),
  imageUrl: optionalUrl,
  areaId: optionalUuid,
});
export const adminCommunityPostSchema = communityPostSchema.extend({
  status: z.enum(COMMUNITY_POST_STATUSES).default("APPROVED"),
  reviewNote: optionalText(500),
});

export const areaSchema = z.object({
  name: trimmed(2, 150),
  nameHi: optionalText(150),
  type: z.enum(AREA_TYPES),
  parentId: optionalUuid,
  isActive: boolish.default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const adminCreateSchema = z.object({
  name: trimmed(2, 120),
  email: z.string().trim().toLowerCase().email().max(190),
  password: strongPassword,
  role: z.enum(ADMIN_ROLES),
  department: optionalText(120),
});
export const adminUpdateSchema = z.object({
  name: optionalText(120),
  role: z.enum(ADMIN_ROLES).optional(),
  department: optionalText(120),
  isActive: boolish.optional(),
  resetPassword: z.preprocess((v) => (v === "" ? undefined : v), strongPassword.optional()),
});

export const settingsSchema = z.object({
  organizationName: optionalText(150),
  organizationNameHi: optionalText(150),
  logoUrl: optionalUrl,
  contactNumber: optionalText(40),
  contactEmail: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email().max(190).optional()),
  website: optionalUrl,
  defaultAreaId: optionalUuid,
  notifyAdminsOnNewComplaint: boolish.optional(),
  notifyUsersByEmail: boolish.optional(),
  imageMaxMb: z.coerce.number().int().min(1).max(50).optional(),
  documentMaxMb: z.coerce.number().int().min(1).max(50).optional(),
  maintenanceMode: boolish.optional(),
  systemAnnouncement: optionalText(500),
  systemAnnouncementHi: optionalText(500),
  require2fa: boolish.optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/** Convert zod issues to a compact, user friendly message. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
    .join("; ");
}

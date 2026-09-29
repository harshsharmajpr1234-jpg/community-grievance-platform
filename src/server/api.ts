import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { collections } from "@/db";
import { type Admin, type User } from "@/db/schema";
import { env } from "@/lib/env";
import { hasPermission, type Permission } from "@/shared/rbac";
import { formatZodError } from "@/shared/validation";
import {
  ADMIN_COOKIE,
  USER_COOKIE,
  tokenFromRequest,
  verifyToken,
  type AdminTokenPayload,
  type UserTokenPayload,
} from "./auth/session";

/* ------------------------------------------------------------------ */
/* Consistent response envelope                                        */
/* ------------------------------------------------------------------ */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) return fail(400, "VALIDATION_ERROR", formatZodError(error));
  if (error instanceof ApiError) return fail(error.status, error.code, error.message, error.details);
  if (error instanceof SyntaxError) return fail(400, "INVALID_JSON", "Request body must be valid JSON");

  // Extract all error metadata cleanly for robust inspection
  const mongoErr = error as { code?: number | string; keyPattern?: Record<string, number>; message?: string; name?: string };
  const errCode = String(mongoErr?.code || (error as any)?.cause?.code || "");
  const errName = String((error as any)?.name || (error as any)?.constructor?.name || "").toLowerCase();
  const errMsg = String(mongoErr?.message || error || "").toLowerCase();
  const errFull = `${errName} ${errMsg} ${String(error).toLowerCase()}`;

  // Handle MongoDB unique constraint violations (11000) cleanly
  if (mongoErr?.code === 11000 || String(mongoErr?.code) === "11000" || errFull.includes("e11000") || errFull.includes("duplicate key")) {
    const kp = mongoErr?.keyPattern ? Object.keys(mongoErr.keyPattern) : [];
    if (kp.includes("mobile") || errFull.includes("mobile")) {
      return fail(409, "MOBILE_EXISTS", "An account with this mobile number already exists. Please login.");
    }
    if (kp.includes("email") || errFull.includes("email")) {
      return fail(409, "EMAIL_EXISTS", "An account with this email address already exists. Please login.");
    }
    return fail(409, "DUPLICATE_ENTRY", "A record with these details already exists.");
  }

  // Handle MongoDB / database connection failures cleanly
  if (
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
  ) {
    console.error("[api] Database connection error:", error);
    return fail(503, "DATABASE_ERROR", "Database connection issue. Please try again in a moment.");
  }

  // Log server side; never leak stack traces to clients.
  console.error("[api] unhandled error", error);
  return fail(500, "INTERNAL_ERROR", env.isProd ? "Internal server error" : String((error as Error)?.message ?? error));
}

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

export function withHandler(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  let raw: unknown;
  if (contentType.includes("application/json")) {
    raw = await req.json();
  } else if (contentType.includes("form")) {
    const fd = await req.formData();
    const obj: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      if (typeof value === "string") obj[key] = value;
    });
    raw = obj;
  } else {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return schema.parse(obj);
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (req.headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/* ------------------------------------------------------------------ */
/* CSRF: cookie-authenticated mutating requests must come from our     */
/* own origin. Bearer-token clients (mobile) are unaffected.            */
/* ------------------------------------------------------------------ */
function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / server calls
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "CSRF_BLOCKED", "Invalid request origin");
  }
  const allowed = new Set<string>([host ?? "", ...env.corsOrigins.map((o) => o.replace(/^https?:\/\//, ""))]);
  if (!allowed.has(originHost)) throw new ApiError(403, "CSRF_BLOCKED", "Cross-origin request blocked");
}

/* ------------------------------------------------------------------ */
/* Auth guards                                                         */
/* ------------------------------------------------------------------ */
export async function optionalUser(req: NextRequest): Promise<User | null> {
  const { token } = tokenFromRequest(req, USER_COOKIE);
  const payload = await verifyToken<UserTokenPayload>(token, "user");
  if (!payload) return null;
  const c = await collections();
  const user = await c.users.findOne({ id: payload.sub });
  return user && user.isActive !== false ? user : null;
}

export async function requireUser(req: NextRequest): Promise<User> {
  const { token, viaCookie } = tokenFromRequest(req, USER_COOKIE);
  const payload = await verifyToken<UserTokenPayload>(token, "user");
  if (!payload) throw new ApiError(401, "UNAUTHORIZED", "Please login to continue");
  if (viaCookie) assertSameOrigin(req);
  const c = await collections();
  const user = await c.users.findOne({ id: payload.sub });
  if (!user || user.isActive === false) throw new ApiError(401, "UNAUTHORIZED", "Account not found or disabled");
  return user;
}

export type AdminContext = { admin: Admin; ip: string; userAgent: string | null };

export async function requireAdmin(
  req: NextRequest,
  permission?: Permission,
  opts: { allowPasswordChangePending?: boolean } = {},
): Promise<AdminContext> {
  const { token, viaCookie } = tokenFromRequest(req, ADMIN_COOKIE);
  const payload = await verifyToken<AdminTokenPayload>(token, "admin");
  if (!payload) throw new ApiError(401, "UNAUTHORIZED", "Admin login required");
  if (viaCookie) assertSameOrigin(req);
  const c = await collections();
  const admin = await c.admins.findOne({ id: payload.sub });
  if (!admin || admin.isActive === false) throw new ApiError(401, "UNAUTHORIZED", "Admin account disabled");
  if (admin.mustChangePassword && !opts.allowPasswordChangePending) {
    throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "Please change your password before continuing");
  }
  if (permission && !hasPermission(admin.role, permission)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
  return { admin, ip: getClientIp(req), userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null };
}

export function assertPermission(admin: Admin, permission: Permission) {
  if (!hasPermission(admin.role, permission)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
}

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { z } from "zod";
import { collections } from "@/db";
import type { User } from "@/db/schema";
import { env } from "@/lib/env";
import { ApiError } from "@/server/api";
import { getEmailProvider } from "@/server/integrations";
import { LIMITS, rateLimit, resetRateLimit } from "@/server/rate-limit";
import type { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/shared/validation";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { USER_SESSION_SECONDS, signToken } from "./session";

const MAX_LOGIN_ATTEMPTS = 8;
const LOCK_MINUTES = 30;

/* ------------------------------------------------------------------ */
/* Public profile — never includes password hashes or secrets           */
/* ------------------------------------------------------------------ */
export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    mobileMasked: maskMobile(user.mobile),
    email: user.email,
    areaId: user.areaId,
    ward: user.ward ?? null,
    address: user.address,
    photoUrl: user.photoUrl,
    language: user.language,
    createdAt: user.createdAt,
  };
}

export function maskMobile(mobile: string): string {
  return mobile.length >= 10 ? `${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}` : "XXXXXXXXXX";
}

/* ------------------------------------------------------------------ */
/* Registration                                                         */
/* ------------------------------------------------------------------ */
export async function registerUser(input: z.infer<typeof registerSchema>, ip: string) {
  const limit = rateLimit(`register:ip:${ip}`, LIMITS.registerPerIp.limit, LIMITS.registerPerIp.windowMs);
  if (!limit.allowed) throw new ApiError(429, "RATE_LIMITED", "Too many registration attempts. Please try again later.");

  const c = await collections();
  const email = input.email?.trim().toLowerCase() ?? null;

  const mobileTaken = await c.users.findOne({ mobile: input.mobile });
  if (mobileTaken) throw new ApiError(409, "MOBILE_EXISTS", "An account with this mobile number already exists. Please login.");

  if (email) {
    const emailTaken = await c.users.findOne({ email });
    if (emailTaken) throw new ApiError(409, "EMAIL_EXISTS", "An account with this email already exists. Please login.");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const userId = randomUUID();

  const newUser: User = {
    id: userId,
    mobile: input.mobile,
    name: input.name,
    email,
    passwordHash,
    failedLoginAttempts: 0,
    lockedUntil: null,
    areaId: null,
    ward: input.ward,
    address: input.address ?? null,
    photoUrl: null,
    language: "hi",
    isActive: true,
    deletionRequestedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const docToInsert: Record<string, any> = { ...newUser };
  if (!docToInsert.email) delete docToInsert.email;

  await c.users.insertOne(docToInsert as User);
  return publicUser(newUser);
}

/* ------------------------------------------------------------------ */
/* Login (mobile number OR email + password) with brute-force protection */
/* ------------------------------------------------------------------ */
function splitIdentifier(identifier: string): { mobile?: string; email?: string } {
  const digits = identifier.replace(/\D/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");
  if (/^[6-9]\d{9}$/.test(digits)) return { mobile: digits };
  return { email: identifier.trim().toLowerCase() };
}

export async function loginUser(input: z.infer<typeof loginSchema>, ip: string) {
  const perIp = rateLimit(`login:ip:${ip}`, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.windowMs);
  const perId = rateLimit(`login:id:${input.identifier.toLowerCase()}`, LIMITS.loginPerIdentifier.limit, LIMITS.loginPerIdentifier.windowMs);
  if (!perIp.allowed || !perId.allowed) {
    throw new ApiError(429, "RATE_LIMITED", "Too many login attempts. Please wait 15 minutes.", {
      retryAfterSec: Math.max(perIp.retryAfterSec, perId.retryAfterSec),
    });
  }

  const { mobile, email } = splitIdentifier(input.identifier);
  const c = await collections();

  const user = await c.users.findOne(
    mobile ? { mobile } : { email: { $regex: `^${email}$`, $options: "i" } }
  );

  const invalid = () => new ApiError(401, "INVALID_CREDENTIALS", "Invalid mobile/email or password");
  if (!user || !user.isActive) throw invalid();
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new ApiError(423, "ACCOUNT_LOCKED", "Account temporarily locked due to failed attempts. Try again later.");
  }
  const isMatch = await verifyPassword(input.password, user.passwordHash);
  if (!isMatch) {
    const failed = user.failedLoginAttempts + 1;
    await c.users.updateOne(
      { id: user.id },
      {
        $set: {
          failedLoginAttempts: failed,
          lockedUntil: failed >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
          updatedAt: new Date(),
        },
      }
    );
    throw invalid();
  }

  const now = new Date();
  const updateData: Partial<User> = {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now,
    updatedAt: now,
  };

  if (needsRehash(user.passwordHash)) {
    updateData.passwordHash = await hashPassword(input.password);
  }

  await c.users.updateOne({ id: user.id }, { $set: updateData });
  const updatedUser = { ...user, ...updateData };

  resetRateLimit(`login:id:${input.identifier.toLowerCase()}`);
  const token = await signToken({ kind: "user", sub: updatedUser.id, mobile: updatedUser.mobile }, USER_SESSION_SECONDS);
  return { token, user: publicUser(updatedUser) };
}

/* ------------------------------------------------------------------ */
/* Email-based password reset                                         */
/* ------------------------------------------------------------------ */
export function emailResetConfigured(): boolean {
  return Boolean(env.emailProviderKey && process.env.EMAIL_PROVIDER_URL);
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

const GENERIC_RESET_MESSAGE = "If an account exists with this email, a password reset link has been sent.";

export async function requestPasswordReset(input: z.infer<typeof forgotPasswordSchema>, ip: string) {
  if (!emailResetConfigured()) {
    throw new ApiError(503, "EMAIL_NOT_CONFIGURED", "Password reset service is currently unavailable. Please contact support.");
  }
  const perIp = rateLimit(`forgot:ip:${ip}`, LIMITS.forgotPerIp.limit, LIMITS.forgotPerIp.windowMs);
  const perEmail = rateLimit(`forgot:email:${input.email}`, LIMITS.forgotPerEmail.limit, LIMITS.forgotPerEmail.windowMs);
  if (!perIp.allowed || !perEmail.allowed) throw new ApiError(429, "RATE_LIMITED", "Too many reset requests. Please try again later.");

  const c = await collections();
  const user = await c.users.findOne({ email: { $regex: `^${input.email}$`, $options: "i" } });
  if (!user || !user.isActive) return { message: GENERIC_RESET_MESSAGE };

  const db = await (await import("@/lib/mongodb")).getDb();
  const resetTokensCol = db.collection("password_reset_tokens");

  await resetTokensCol.updateMany({ userId: user.id, usedAt: null }, { $set: { usedAt: new Date() } });
  const { token, tokenHash } = generateResetToken();

  await resetTokensCol.insertOne({
    id: randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + env.resetTokenMinutes * 60 * 1000),
    usedAt: null,
    ipAddress: ip,
    createdAt: new Date(),
  });

  const resetUrl = `${env.appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  try {
    await getEmailProvider().send(
      user.email!,
      "Reset your password — Jan Samasya Nivaran Manch",
      `<p>Namaste${user.name ? ` ${user.name}` : ""},</p><p>Use the link below to set a new password. It expires in ${env.resetTokenMinutes} minutes and can be used only once:</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, please ignore this email.</p>`,
    );
  } catch (error) {
    console.error("[auth] reset email failed", error);
  }
  return { message: GENERIC_RESET_MESSAGE };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const tokenHash = createHash("sha256").update(input.token.trim()).digest("hex");
  const db = await (await import("@/lib/mongodb")).getDb();
  const resetTokensCol = db.collection("password_reset_tokens");

  const row = await resetTokensCol.findOne({ tokenHash });
  if (!row || row.usedAt || new Date(row.expiresAt) < new Date()) {
    throw new ApiError(400, "RESET_TOKEN_INVALID", "This reset link is invalid or has expired. Please request a new one.");
  }

  const c = await collections();
  const user = await c.users.findOne({ id: row.userId });
  if (!user || !user.isActive) throw new ApiError(400, "RESET_TOKEN_INVALID", "This reset link is invalid or has expired.");

  const newHash = await hashPassword(input.newPassword);
  const now = new Date();

  await c.users.updateOne(
    { id: user.id },
    { $set: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: now } }
  );

  await resetTokensCol.updateMany({ userId: user.id, usedAt: null }, { $set: { usedAt: now } });
  return { reset: true };
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { AdminRole } from "@/shared/constants";

export const USER_COOKIE = "updkp_user";
export const ADMIN_COOKIE = "updkp_admin";
const ISSUER = "updkp";

export type UserTokenPayload = { kind: "user"; sub: string; mobile: string };
export type AdminTokenPayload = { kind: "admin"; sub: string; email: string; role: AdminRole; pv: number };

const secretKey = () => new TextEncoder().encode(env.jwtSecret);

export async function signToken(payload: UserTokenPayload | AdminTokenPayload, expiresInSeconds: number): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secretKey());
}

export async function verifyToken<T extends UserTokenPayload | AdminTokenPayload>(
  token: string | undefined | null,
  kind: T["kind"],
): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
    if (payload.kind !== kind || typeof payload.sub !== "string") return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProd,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const USER_SESSION_SECONDS = env.userSessionDays * 24 * 3600;
export const ADMIN_SESSION_SECONDS = env.adminSessionHours * 3600;

export async function setUserCookie(token: string) {
  (await cookies()).set(USER_COOKIE, token, cookieOptions(USER_SESSION_SECONDS));
}
export async function clearUserCookie() {
  (await cookies()).set(USER_COOKIE, "", cookieOptions(0));
}
export async function setAdminCookie(token: string) {
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(ADMIN_SESSION_SECONDS));
}
export async function clearAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, "", cookieOptions(0));
}

/** Extract a token from a request: cookie first, then Bearer header (mobile app). */
export function tokenFromRequest(req: NextRequest, cookieName: string): { token: string | null; viaCookie: boolean } {
  const cookie = req.cookies.get(cookieName)?.value;
  if (cookie) return { token: cookie, viaCookie: true };
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return { token: auth.slice(7).trim(), viaCookie: false };
  return { token: null, viaCookie: false };
}

/** Server-component helpers (read-only). */
export async function getUserSession(): Promise<UserTokenPayload | null> {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  return verifyToken<UserTokenPayload>(token, "user");
}
export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyToken<AdminTokenPayload>(token, "admin");
}

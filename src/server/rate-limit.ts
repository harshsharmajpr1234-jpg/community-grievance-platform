/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Suitable for a single instance. For multi-instance deployments swap the
 * store for Redis (the interface below is intentionally minimal). Login
 * brute-force protection is additionally enforced per account in the database
 * (failed attempts + lockout), so it holds across restarts and instances.
 */
type Bucket = number[];

const store: Map<string, Bucket> =
  ((globalThis as typeof globalThis & { __updkpRateStore?: Map<string, Bucket> }).__updkpRateStore ??= new Map());

let lastSweep = Date.now();

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, times] of store) {
      const alive = times.filter((t) => now - t < windowMs * 2);
      if (alive.length === 0) store.delete(k);
      else store.set(k, alive);
    }
  }
  const times = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - times[0])) / 1000));
    store.set(key, times);
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  times.push(now);
  store.set(key, times);
  return { allowed: true, remaining: limit - times.length, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

export const LIMITS = {
  registerPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  loginPerIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  loginPerIdentifier: { limit: 8, windowMs: 15 * 60 * 1000 },
  forgotPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  forgotPerEmail: { limit: 3, windowMs: 60 * 60 * 1000 },
  adminLoginPerIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  adminLoginPerEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  complaintPerUser: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  complaintPerIp: { limit: 20, windowMs: 60 * 60 * 1000 },
  trackPerIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  uploadPerUser: { limit: 30, windowMs: 60 * 60 * 1000 },
  communityPostPerUser: { limit: 3, windowMs: 24 * 60 * 60 * 1000 },
};

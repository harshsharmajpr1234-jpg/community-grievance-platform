import { describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks with retry info", () => {
    resetRateLimit("t1");
    for (let i = 0; i < 3; i++) expect(rateLimit("t1", 3, 60_000).allowed).toBe(true);
    const blocked = rateLimit("t1", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
  it("keys are independent", () => {
    resetRateLimit("a");
    resetRateLimit("b");
    rateLimit("a", 1, 60_000);
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
  });
});

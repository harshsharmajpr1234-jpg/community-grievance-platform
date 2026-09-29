import { describe, expect, it } from "vitest";
import { generateResetToken } from "@/server/auth/account";
import { base32Decode, base32Encode, generateTotpSecret, hashPassword, needsRehash, totpCode, verifyPassword, verifyTotp } from "@/server/auth/password";
import { signToken, verifyToken } from "@/server/auth/session";

describe("password hashing (bcrypt)", () => {
  it("hashes with a random salt and verifies", async () => {
    const h1 = await hashPassword("Str0ngPassw0rd!");
    const h2 = await hashPassword("Str0ngPassw0rd!");
    expect(h1).not.toBe(h2);
    expect(h1.startsWith("$2")).toBe(true);
    expect(await verifyPassword("Str0ngPassw0rd!", h1)).toBe(true);
    expect(await verifyPassword("wrong", h1)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });
  it("normalises unicode before hashing", async () => {
    const h = await hashPassword("pässwörd123ABC");
    expect(await verifyPassword("pässwörd123ABC", h)).toBe(true);
  });
  it("flags legacy scrypt hashes for rehashing", async () => {
    expect(needsRehash("scrypt$16384$c2FsdA==$aGFzaA==")).toBe(true);
    expect(needsRehash(await hashPassword("x"))).toBe(false);
    expect(needsRehash(null)).toBe(false);
  });
});

describe("password reset tokens", () => {
  it("generates unique cryptographically-sized tokens with stable hashes", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("TOTP", () => {
  it("round-trips base32", () => {
    const buf = Buffer.from("hello world 12345");
    expect(base32Decode(base32Encode(buf)).toString()).toBe(buf.toString());
  });
  it("verifies the current code and rejects garbage", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, totpCode(secret))).toBe(true);
    expect(verifyTotp(secret, "000000")).toBe(totpCode(secret) === "000000");
    expect(verifyTotp(secret, "abc")).toBe(false);
  });
});

describe("session tokens", () => {
  it("signs and verifies user/admin tokens with kind separation", async () => {
    const token = await signToken({ kind: "user", sub: "u1", mobile: "9876543210" }, 60);
    expect((await verifyToken(token, "user"))?.sub).toBe("u1");
    expect(await verifyToken(token, "admin")).toBeNull();
    expect(await verifyToken("garbage", "user")).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const token = await signToken({ kind: "user", sub: "u1", mobile: "9876543210" }, -10);
    expect(await verifyToken(token, "user")).toBeNull();
  });
});

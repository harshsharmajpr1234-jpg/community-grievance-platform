import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Password hashing with bcrypt (cost 10). Passwords are never stored in
 * plain text. Hashes created by the previous scrypt scheme (prefix "scrypt$")
 * are still verified so existing accounts keep working after the upgrade;
 * they are re-hashed with bcrypt on next successful login.
 */
const BCRYPT_COST = 10;
const SCRYPT_N = 16384;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.normalize("NFKC"), BCRYPT_COST);
}

export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password.normalize("NFKC"), BCRYPT_COST);
}

function verifyScrypt(password: string, stored: string): boolean {
  const [algo, nStr, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const N = Number(nStr) || SCRYPT_N;
  const candidate = scryptSync(password.normalize("NFKC"), salt, KEY_LEN, { N });
  const expected = Buffer.from(hash, "base64");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("scrypt$")) return verifyScrypt(password, stored);
  try {
    return await bcrypt.compare(password.normalize("NFKC"), stored);
  } catch {
    return false;
  }
}

export function verifyPasswordSync(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith("scrypt$")) return verifyScrypt(password, stored);
  try {
    return bcrypt.compareSync(password.normalize("NFKC"), stored);
  } catch {
    return false;
  }
}

/** True when a stored hash uses the legacy scheme and should be re-hashed. */
export function needsRehash(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith("scrypt$"));
}

/* ------------------------------------------------------------------ */
/* TOTP (RFC 6238) for admin two-factor authentication                  */
/* ------------------------------------------------------------------ */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: string, timeStep = Math.floor(Date.now() / 30000)): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(timeStep));
  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (let w = -window; w <= window; w++) {
    const expected = totpCode(secret, now + w);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return true;
  }
  return false;
}

export function totpUri(secret: string, account: string, issuer = "JSNM Admin"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

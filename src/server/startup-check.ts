/**
 * Startup environment validation. Runs once on server boot (see
 * src/instrumentation.ts) and logs diagnostic warnings when
 * production-critical secrets are missing.
 */
import { env } from "@/lib/env";

export function startupEnvCheck(): string[] {
  const problems: string[] = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET is missing or shorter than 32 characters — resident and admin login WILL fail at session creation.");
  }
  if (!process.env.MONGODB_URI && env.isProd) {
    problems.push("MONGODB_URI is missing in production environment.");
  }
  if (env.isProd) {
    if (process.env.SEED_DEMO_DATA === "true") problems.push("SEED_DEMO_DATA=true in production — demo records must never be seeded in production.");
    if (process.env.DEMO_OTP) problems.push("DEMO_OTP is set in production — remove it immediately.");
    if (!env.telegramBotToken || !env.telegramAdminChatId) {
      problems.push("Telegram admin alerts not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID) — new-complaint phone alerts will be skipped.");
    }
    if (!env.emailProviderKey || !process.env.EMAIL_PROVIDER_URL) {
      problems.push("Email provider not configured — password reset will answer 503 EMAIL_NOT_CONFIGURED.");
    }
  }
  for (const p of problems) console.error(`[startup] FATAL config problem: ${p}`);
  if (problems.length === 0) console.info("[startup] environment check passed");
  return problems;
}

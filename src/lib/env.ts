/**
 * Centralised environment access. Nothing here is ever sent to the browser
 * (only NEXT_PUBLIC_* variables are exposed to the client bundle).
 */
const isProd = process.env.NODE_ENV === "production";

function required(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) {
    console.error(`[env] WARNING: Missing environment variable ${name}. Using fallback key for stability.`);
  }
  return devFallback;
}

export const env = {
  isProd,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? process.env.URL ?? "https://jansamashya.netlify.app",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "",
  get jwtSecret() {
    const v = process.env.JWT_SECRET;
    if (v && v.length > 0) return v;
    if (isProd) {
      throw new Error("CONFIGURATION_ERROR: JWT_SECRET environment variable is missing in production environment.");
    }
    return "jan-samasya-nivaran-manch-ward-12-13-secure-jwt-secret-key-2026";
  },
  emailProviderKey: process.env.EMAIL_PROVIDER_KEY ?? process.env.EMAIL_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "no-reply@example.com",
  storageKey: process.env.STORAGE_KEY,
  storageBucket: process.env.STORAGE_BUCKET,
  storageProvider: process.env.STORAGE_PROVIDER ?? "local",
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  pushNotificationKey: process.env.PUSH_NOTIFICATION_KEY,
  uploadDir: process.env.UPLOAD_DIR ?? "./storage/uploads",
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  setupToken: process.env.ADMIN_SETUP_TOKEN,
  seedDemoData: process.env.SEED_DEMO_DATA !== "false",
  resetTokenMinutes: Number(process.env.RESET_TOKEN_MINUTES ?? 60),
  userSessionDays: Number(process.env.USER_SESSION_DAYS ?? 30),
  adminSessionHours: Number(process.env.ADMIN_SESSION_HOURS ?? 12),
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

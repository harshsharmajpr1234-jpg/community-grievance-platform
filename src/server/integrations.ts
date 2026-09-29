/**
 * Integration interfaces for SMS / Email / Push.
 *
 * Real providers require credentials supplied through environment variables.
 * When they are missing we fall back to a console provider that logs the
 * message (development) — we never pretend a message was delivered.
 */
import { env } from "@/lib/env";

export type DeliveryResult = { delivered: boolean; provider: string; providerId?: string; error?: string };

export interface EmailProvider {
  name: string;
  send(to: string, subject: string, html: string): Promise<DeliveryResult>;
}
export interface PushProvider {
  name: string;
  send(target: string, title: string, body: string, data?: Record<string, string>): Promise<DeliveryResult>;
}

const consoleEmail: EmailProvider = {
  name: "console",
  async send(to, subject) {
    if (!env.isProd) console.info(`[email:console] to=${to} :: ${subject}`);
    return { delivered: false, provider: "console" };
  },
};

const httpEmail: EmailProvider = {
  name: "http-gateway",
  async send(to, subject, html) {
    const url = process.env.EMAIL_PROVIDER_URL;
    if (!url || !env.emailProviderKey) return consoleEmail.send(to, subject, html);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.emailProviderKey}` },
        body: JSON.stringify({ from: env.emailFrom, to, subject, html }),
      });
      return res.ok
        ? { delivered: true, provider: "http-gateway" }
        : { delivered: false, provider: "http-gateway", error: `HTTP ${res.status}` };
    } catch (error) {
      return { delivered: false, provider: "http-gateway", error: (error as Error).message };
    }
  },
};

const consolePush: PushProvider = {
  name: "console",
  async send(target, title) {
    if (!env.isProd) console.info(`[push:console] target=${target} :: ${title}`);
    return { delivered: false, provider: "console" };
  },
};

const httpPush: PushProvider = {
  name: "http-gateway",
  async send(target, title, body, data) {
    const url = process.env.PUSH_PROVIDER_URL;
    if (!url || !env.pushNotificationKey) return consolePush.send(target, title, body, data);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `key=${env.pushNotificationKey}` },
        body: JSON.stringify({ to: target, notification: { title, body }, data }),
      });
      return res.ok
        ? { delivered: true, provider: "http-gateway" }
        : { delivered: false, provider: "http-gateway", error: `HTTP ${res.status}` };
    } catch (error) {
      return { delivered: false, provider: "http-gateway", error: (error as Error).message };
    }
  },
};

export function getEmailProvider(): EmailProvider {
  return env.emailProviderKey ? httpEmail : consoleEmail;
}
export function getPushProvider(): PushProvider {
  return env.pushNotificationKey ? httpPush : consolePush;
}

export type TelegramComplaintAlert = {
  code: string;
  category: string;
  area: string;
  priority: string;
  status: string;
  adminUrl: string;
};

/**
 * Pure builder for the admin Telegram alert. No private resident information
 * (name, mobile, address, GPS) is ever included — only the admin panel link.
 */
export function buildTelegramNewComplaintMessage(a: TelegramComplaintAlert): string {
  return [
    "\uD83D\uDD14 NEW COMPLAINT",
    "",
    "Complaint:",
    a.code,
    "",
    "Category:",
    a.category,
    "",
    "Area:",
    a.area,
    "",
    `Priority: ${a.priority}`,
    "",
    "Status:",
    a.status,
    "",
    "Open Admin Panel:",
    a.adminUrl,
  ].join("\n");
}

/**
 * Zero-cost admin phone notification via a Telegram bot. Requires
 * TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID. Failures are returned, never
 * thrown, so notification problems can never block complaint creation.
 */
export async function sendTelegramAlert(text: string): Promise<DeliveryResult> {
  const token = env.telegramBotToken;
  const chatId = env.telegramAdminChatId;
  if (!token || !chatId) return { delivered: false, provider: "telegram", error: "not-configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { delivered: false, provider: "telegram", error: `HTTP ${res.status} ${body.slice(0, 120)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { result?: { message_id?: number } };
    return { delivered: true, provider: "telegram", providerId: json.result?.message_id ? String(json.result.message_id) : undefined };
  } catch (error) {
    return { delivered: false, provider: "telegram", error: (error as Error).message };
  }
}

export function integrationStatus() {
  return {
    email: { configured: Boolean(env.emailProviderKey && process.env.EMAIL_PROVIDER_URL), provider: getEmailProvider().name },
    push: { configured: Boolean(env.pushNotificationKey && process.env.PUSH_PROVIDER_URL), provider: getPushProvider().name },
    storage: { configured: Boolean(env.storageKey && env.storageBucket), provider: env.storageKey ? "object-storage" : "local-disk" },
    telegram: {
      configured: Boolean(env.telegramBotToken && env.telegramAdminChatId),
      provider: env.telegramBotToken ? "telegram" : "none",
    },
  };
}

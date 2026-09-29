import { collections } from "@/db";
import { BRAND, UPLOAD_DEFAULTS } from "@/shared/constants";
import type { SettingsInput } from "@/shared/validation";

export type SystemSettings = {
  organizationName: string;
  organizationNameHi: string;
  logoUrl?: string;
  contactNumber?: string;
  contactEmail?: string;
  website?: string;
  defaultAreaId?: string;
  notifyAdminsOnNewComplaint: boolean;
  notifyUsersByEmail: boolean;
  imageMaxMb: number;
  documentMaxMb: number;
  maintenanceMode: boolean;
  systemAnnouncement?: string;
  systemAnnouncementHi?: string;
  require2fa: boolean;
};

export const DEFAULT_SETTINGS: SystemSettings = {
  organizationName: BRAND.name,
  organizationNameHi: BRAND.nameHi,
  notifyAdminsOnNewComplaint: true,
  notifyUsersByEmail: false,
  imageMaxMb: UPLOAD_DEFAULTS.imageMaxMb,
  documentMaxMb: UPLOAD_DEFAULTS.documentMaxMb,
  maintenanceMode: false,
  require2fa: process.env.ADMIN_REQUIRE_2FA === "true",
};

export const CRITICAL_SETTING_KEYS: (keyof SettingsInput)[] = [
  "maintenanceMode",
  "require2fa",
  "imageMaxMb",
  "documentMaxMb",
  "defaultAreaId",
];

const SETTINGS_KEY = "general";
let cache: { value: SystemSettings; at: number } | null = null;

export async function getSettings(): Promise<SystemSettings> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  try {
    const c = await collections();
    const row = await c.systemSettings.findOne({ key: SETTINGS_KEY });
    const parsedValue = row?.value ? JSON.parse(row.value) : {};
    const value = { ...DEFAULT_SETTINGS, ...parsedValue };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(patch: Partial<SystemSettings>, adminId: string): Promise<SystemSettings> {
  const current = await getSettings();
  const next: SystemSettings = { ...current, ...patch };
  const c = await collections();
  const now = new Date();

  await c.systemSettings.updateOne(
    { key: SETTINGS_KEY },
    { $set: { key: SETTINGS_KEY, value: JSON.stringify(next), description: "General system settings", updatedAt: now } },
    { upsert: true }
  );

  cache = { value: next, at: Date.now() };
  return next;
}

export function invalidateSettingsCache() {
  cache = null;
}

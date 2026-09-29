import { ApiError, ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { integrationStatus } from "@/server/integrations";
import { logAudit } from "@/server/services/audit";
import { CRITICAL_SETTING_KEYS, getSettings, updateSettings } from "@/server/services/settings";
import { settingsSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  await requireAdmin(req, "settings.view");
  return ok({ settings: await getSettings(), integrations: integrationStatus() });
});

/** PATCH /api/admin/settings — SUPER_ADMIN only for critical keys */
export const PATCH = withHandler(async (req) => {
  const ctx = await requireAdmin(req, "settings.manage");
  const input = await parseBody(req, settingsSchema);
  const touchesCritical = CRITICAL_SETTING_KEYS.some((k) => input[k] !== undefined);
  if (touchesCritical && ctx.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Only a SUPER_ADMIN can change critical settings");
  }
  const before = await getSettings();
  const settings = await updateSettings(input, ctx.admin.id);
  await logAudit(ctx, "settings.update", "system_settings", "general", before, input);
  return ok({ settings });
});

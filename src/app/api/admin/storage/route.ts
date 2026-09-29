import { ok, fail, requireAdmin, withHandler } from "@/server/api";
import { StorageService } from "@/server/storage";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  await requireAdmin(req, "settings.view");
  const report = await StorageService.getStorageReport();
  return ok(report);
});

export const POST = withHandler(async (req) => {
  const { admin } = await requireAdmin(req, "settings.manage");
  if (admin.role !== "SUPER_ADMIN") {
    return fail(403, "FORBIDDEN", "Only Super Admins can manually trigger attachment cleanup");
  }

  const result = await StorageService.cleanupExpiredFiles();
  const report = await StorageService.getStorageReport();

  return ok({
    result,
    report,
  });
});

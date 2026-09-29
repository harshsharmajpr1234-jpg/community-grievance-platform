import { ok, withHandler } from "@/server/api";
import { listAreas, listCategories } from "@/server/services/complaints";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/** GET /api/meta — reference data needed by web & mobile forms */
export const GET = withHandler(async () => {
  const [categories, areas, settings] = await Promise.all([listCategories(), listAreas(), getSettings()]);
  return ok({
    categories,
    areas,
    settings: {
      organizationName: settings.organizationName,
      organizationNameHi: settings.organizationNameHi,
      contactNumber: settings.contactNumber,
      contactEmail: settings.contactEmail,
      maintenanceMode: settings.maintenanceMode,
      systemAnnouncement: settings.systemAnnouncement,
      systemAnnouncementHi: settings.systemAnnouncementHi,
      upload: { imageMaxMb: settings.imageMaxMb, documentMaxMb: settings.documentMaxMb },
    },
  });
});

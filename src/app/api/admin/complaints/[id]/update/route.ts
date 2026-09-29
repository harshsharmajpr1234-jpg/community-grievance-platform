import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { applyAdminAction } from "@/server/services/complaints";
import { adminComplaintActionSchema } from "@/shared/validation";

export const dynamic = "force-dynamic";

/** POST /api/admin/complaints/:id/update — alias of PATCH for clients that cannot send PATCH */
export const POST = withHandler(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAdmin(req, "complaints.view");
  const action = await parseBody(req, adminComplaintActionSchema);
  return ok(await applyAdminAction(ctx, id, action), { status: 201 });
});

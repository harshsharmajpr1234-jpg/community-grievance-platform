import { z } from "zod";
import { ok, parseBody, requireAdmin, withHandler } from "@/server/api";
import { setUserActive } from "@/server/services/admin";

export const dynamic = "force-dynamic";

export const PATCH = withHandler(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAdmin(req, "users.manage");
  const { isActive } = await parseBody(req, z.object({ isActive: z.boolean() }));
  await setUserActive(ctx, id, isActive);
  return ok({ updated: true });
});

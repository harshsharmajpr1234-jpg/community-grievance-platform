import { ApiError, ok, requireAdmin, withHandler } from "@/server/api";
import { contentRegistry, isContentType } from "@/server/services/content";

export const dynamic = "force-dynamic";

function registry(type: string) {
  if (!isContentType(type)) throw new ApiError(404, "NOT_FOUND", "Unknown content type");
  return contentRegistry[type];
}

export const GET = withHandler(async (req, { params }) => {
  const { type, id } = await params;
  const reg = registry(type);
  await requireAdmin(req, reg.permission);
  const item = await reg.get(id);
  if (!item) throw new ApiError(404, "NOT_FOUND", "Not found");
  return ok(item);
});

export const PATCH = withHandler(async (req, { params }) => {
  const { type, id } = await params;
  const reg = registry(type);
  const ctx = await requireAdmin(req, reg.permission);
  const body = (await req.json()) as Record<string, unknown>;
  return ok(await reg.update(id, body, ctx));
});

export const DELETE = withHandler(async (req, { params }) => {
  const { type, id } = await params;
  const reg = registry(type);
  const ctx = await requireAdmin(req, reg.permission);
  await reg.remove(id, ctx);
  return ok({ deleted: true });
});

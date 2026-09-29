import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, USER_COOKIE, tokenFromRequest, verifyToken, type AdminTokenPayload, type UserTokenPayload } from "@/server/auth/session";
import { ApiError, withHandler } from "@/server/api";
import { documentByStoredName } from "@/server/services/complaints";
import { getStorage } from "@/server/storage";

export const dynamic = "force-dynamic";

/** GET /api/files/:name — streams an uploaded file after an authorization check */
export const GET = withHandler(async (req: NextRequest, { params }) => {
  const { name } = await params;
  const record = await documentByStoredName(name);
  if (!record) throw new ApiError(404, "NOT_FOUND", "File not found");

  const publicOk = record.doc.isPublic && record.complaintPublic;
  if (!publicOk) {
    const admin = await verifyToken<AdminTokenPayload>(tokenFromRequest(req, ADMIN_COOKIE).token, "admin");
    const user = await verifyToken<UserTokenPayload>(tokenFromRequest(req, USER_COOKIE).token, "user");
    if (!admin && !(user && user.sub === record.complaintUserId)) throw new ApiError(404, "NOT_FOUND", "File not found");
  }
  const data = await getStorage().read(name);
  if (!data) throw new ApiError(404, "NOT_FOUND", "File not found");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": record.doc.mimeType,
      "content-length": String(data.length),
      "cache-control": publicOk ? "public, max-age=86400" : "private, no-store",
      "content-disposition": `inline; filename="${record.doc.originalName.replace(/[^\w.\-]/g, "_")}"`,
      "x-content-type-options": "nosniff",
    },
  });
});

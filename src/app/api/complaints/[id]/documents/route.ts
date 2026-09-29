import { ApiError, ok, requireUser, withHandler } from "@/server/api";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { registerDocument } from "@/server/services/complaints";
import { getSettings } from "@/server/services/settings";
import { getStorage, secureFileName, validateUploadBuffer } from "@/server/storage";

export const dynamic = "force-dynamic";

/** POST /api/complaints/:id/documents — multipart/form-data with field "file" */
export const POST = withHandler(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const limit = rateLimit(`upload:${user.id}`, LIMITS.uploadPerUser.limit, LIMITS.uploadPerUser.windowMs);
  if (!limit.allowed) throw new ApiError(429, "RATE_LIMITED", "Upload limit reached. Please try later.");

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "VALIDATION_ERROR", "Missing file");
  const settings = await getSettings();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { kind, mime, ext } = validateUploadBuffer(file.type, buffer.length, buffer.subarray(0, 16), settings);
  const storedName = secureFileName(ext);
  await getStorage().save(storedName, buffer);
  try {
    const doc = await registerDocument(id, { user }, { kind, storedName, originalName: file.name || `upload.${ext}`, mimeType: mime, sizeBytes: buffer.length });
    return ok(doc, { status: 201 });
  } catch (error) {
    await getStorage().remove(storedName);
    throw error;
  }
});

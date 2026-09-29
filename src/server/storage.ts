import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { getCollection } from "@/lib/mongodb";
import { ATTACHMENT_RETENTION_DAYS, UPLOAD_DEFAULTS, type DocumentKind } from "@/shared/constants";
import { ApiError } from "./api";

/**
 * Storage provider interface for saving, reading, and removing file binaries.
 */
export interface StorageProvider {
  name: string;
  save(storedName: string, data: Buffer): Promise<void>;
  read(storedName: string): Promise<Buffer | null>;
  remove(storedName: string): Promise<boolean>;
}

const SAFE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/;

class LocalDiskStorage implements StorageProvider {
  name = "local-disk";
  private dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.uploadDir);

  private resolve(storedName: string) {
    if (!SAFE_NAME.test(storedName)) throw new ApiError(400, "INVALID_FILE", "Invalid file name");
    return path.join(this.dir, storedName);
  }

  async save(storedName: string, data: Buffer) {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.resolve(storedName), data, { flag: "wx" });
  }

  async read(storedName: string) {
    try {
      return await readFile(this.resolve(storedName));
    } catch {
      return null;
    }
  }

  async remove(storedName: string): Promise<boolean> {
    try {
      await unlink(this.resolve(storedName));
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "ENOENT") return true; // Already removed cleanly
      return false;
    }
  }
}

class S3StorageProvider implements StorageProvider {
  name = "s3";
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.STORAGE_ENDPOINT || "";
  }

  async save(storedName: string, data: Buffer): Promise<void> {
    if (!this.endpoint) {
      const fallback = new LocalDiskStorage();
      return fallback.save(storedName, data);
    }
  }

  async read(storedName: string): Promise<Buffer | null> {
    if (!this.endpoint) {
      const fallback = new LocalDiskStorage();
      return fallback.read(storedName);
    }
    return null;
  }

  async remove(storedName: string): Promise<boolean> {
    if (!this.endpoint) {
      const fallback = new LocalDiskStorage();
      return fallback.remove(storedName);
    }
    return true;
  }
}

let activeProvider: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (!activeProvider) {
    const providerName = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
    activeProvider = providerName === "s3" ? new S3StorageProvider() : new LocalDiskStorage();
  }
  return activeProvider;
}

/* ------------------------------------------------------------------ */
/* MongoDB Metadata Document Schema                                    */
/* ------------------------------------------------------------------ */
export interface AttachmentMetadataDoc {
  fileId: string;
  complaintId?: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  storageProvider: string;
  storageKey: string;
  uploadedBy: string;
  createdAt: Date;
  expiresAt?: Date | null;
  status: "ACTIVE" | "PENDING_CLEANUP" | "DELETED" | "CLEANUP_FAILED";
  cleanupError?: string | null;
  lastCleanupAttempt?: Date | null;
}

export interface StorageReport {
  totalFiles: number;
  totalSizeBytes: number;
  pendingCleanupCount: number;
  successfullyDeletedCount: number;
  failedDeletionsCount: number;
  lastCleanupRun: Date | null;
}

/* ------------------------------------------------------------------ */
/* StorageService Abstraction                                         */
/* ------------------------------------------------------------------ */
export class StorageService {
  private static lastCleanupRun: Date | null = null;

  /**
   * Upload binary data to persistent storage, then record lightweight metadata in MongoDB.
   */
  static async uploadFile(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    uploadedBy: string;
    complaintId?: string | null;
  }): Promise<AttachmentMetadataDoc> {
    const { buffer, originalName, mimeType, uploadedBy, complaintId } = params;

    const validated = validateUploadBuffer(mimeType, buffer.length, buffer);
    const storedName = secureFileName(validated.ext);
    const provider = getStorage();

    // 1. Save binary to storage provider
    await provider.save(storedName, buffer);

    // 2. Insert metadata record into MongoDB
    const doc: AttachmentMetadataDoc = {
      fileId: storedName,
      complaintId: complaintId || null,
      originalName: originalName || storedName,
      mimeType: validated.mime,
      size: buffer.length,
      storageProvider: provider.name,
      storageKey: storedName,
      uploadedBy,
      createdAt: new Date(),
      expiresAt: null,
      status: "ACTIVE",
    };

    const collection = await getCollection<AttachmentMetadataDoc>("complaint_attachments");
    await collection.insertOne(doc as unknown as AttachmentMetadataDoc);

    return doc;
  }

  /**
   * Retrieve file binary stream/buffer by fileId.
   */
  static async getFile(fileId: string): Promise<{ doc: AttachmentMetadataDoc; data: Buffer } | null> {
    const collection = await getCollection<AttachmentMetadataDoc>("complaint_attachments");
    const doc = await collection.findOne({ fileId });
    if (!doc || doc.status === "DELETED") return null;

    const provider = getStorage();
    const data = await provider.read(doc.storageKey);
    if (!data) return null;

    return { doc: doc as unknown as AttachmentMetadataDoc, data };
  }

  /**
   * Delete a single file. Deletes binary from storage first.
   * If storage deletion succeeds, updates/removes MongoDB metadata.
   * If storage deletion fails, marks metadata as CLEANUP_FAILED and retains record.
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    const collection = await getCollection<AttachmentMetadataDoc>("complaint_attachments");
    const doc = await collection.findOne({ fileId });
    if (!doc) return true;

    const provider = getStorage();
    const storageSuccess = await provider.remove(doc.storageKey);

    if (storageSuccess) {
      await collection.updateOne(
        { fileId },
        {
          $set: {
            status: "DELETED",
            cleanupError: null,
            lastCleanupAttempt: new Date(),
          },
        },
      );
      return true;
    } else {
      await collection.updateOne(
        { fileId },
        {
          $set: {
            status: "CLEANUP_FAILED",
            cleanupError: "Storage provider failed to delete file binary from target object path",
            lastCleanupAttempt: new Date(),
          },
        },
      );
      return false;
    }
  }

  /**
   * Delete all attachments belonging to a complaint.
   */
  static async deleteComplaintFiles(complaintId: string): Promise<{ total: number; succeeded: number }> {
    const collection = await getCollection<AttachmentMetadataDoc>("complaint_attachments");
    const docs = await collection.find({ complaintId, status: { $ne: "DELETED" } }).toArray();

    let succeeded = 0;
    for (const doc of docs) {
      const ok = await this.deleteFile(doc.fileId);
      if (ok) succeeded++;
    }

    return { total: docs.length, succeeded };
  }

  /**
   * Automatically cleanup expired attachment files for RESOLVED/CLOSED complaints
   * older than retentionDays (default ATTACHMENT_RETENTION_DAYS = 90).
   * Safe and idempotent.
   */
  static async cleanupExpiredFiles(retentionDays: number = ATTACHMENT_RETENTION_DAYS): Promise<{
    processed: number;
    deleted: number;
    failed: number;
  }> {
    this.lastCleanupRun = new Date();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const complaintsCol = await getCollection("complaints");
    // Find resolved or closed complaints older than retention period cutoff
    const closedComplaints = await complaintsCol
      .find({
        status: { $in: ["RESOLVED", "CLOSED"] },
        updatedAt: { $lte: cutoffDate },
      })
      .toArray();

    const closedComplaintIds = closedComplaints.map((c) => (c._id ? c._id.toString() : c.id)).filter(Boolean);

    if (closedComplaintIds.length === 0) {
      return { processed: 0, deleted: 0, failed: 0 };
    }

    const attachmentsCol = await getCollection<AttachmentMetadataDoc>("complaint_attachments");
    const eligibleAttachments = await attachmentsCol
      .find({
        complaintId: { $in: closedComplaintIds },
        status: { $in: ["ACTIVE", "PENDING_CLEANUP", "CLEANUP_FAILED"] },
      })
      .toArray();

    let deleted = 0;
    let failed = 0;

    for (const file of eligibleAttachments) {
      const ok = await this.deleteFile(file.fileId);
      if (ok) deleted++;
      else failed++;
    }

    return { processed: eligibleAttachments.length, deleted, failed };
  }

  /**
   * Aggregate storage report stats for the Admin Storage Dashboard.
   */
  static async getStorageReport(): Promise<StorageReport> {
    const collection = await getCollection<AttachmentMetadataDoc>("complaint_attachments");

    const allDocs = await collection.find({}).toArray();

    let totalFiles = 0;
    let totalSizeBytes = 0;
    let pendingCleanupCount = 0;
    let successfullyDeletedCount = 0;
    let failedDeletionsCount = 0;

    const cutoffDate = new Date(Date.now() - ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    for (const doc of allDocs) {
      if (doc.status === "DELETED") {
        successfullyDeletedCount++;
      } else if (doc.status === "CLEANUP_FAILED") {
        failedDeletionsCount++;
        totalFiles++;
        totalSizeBytes += doc.size || 0;
      } else {
        totalFiles++;
        totalSizeBytes += doc.size || 0;

        if (doc.createdAt && new Date(doc.createdAt) <= cutoffDate) {
          pendingCleanupCount++;
        }
      }
    }

    return {
      totalFiles,
      totalSizeBytes,
      pendingCleanupCount,
      successfullyDeletedCount,
      failedDeletionsCount,
      lastCleanupRun: this.lastCleanupRun,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Validation: declared MIME + magic bytes + size limits                */
/* ------------------------------------------------------------------ */
export type UploadLimits = { imageMaxMb: number; documentMaxMb: number };

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function kindForMime(mime: string): DocumentKind | null {
  if (UPLOAD_DEFAULTS.imageMimes.includes(mime)) return "IMAGE";
  if (UPLOAD_DEFAULTS.documentMimes.includes(mime)) return "DOCUMENT";
  return null;
}

export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  return null;
}

export function validateUploadBuffer(
  declaredMime: string,
  size: number,
  head: Buffer,
  limits: UploadLimits = UPLOAD_DEFAULTS,
): { kind: DocumentKind; mime: string; ext: string } {
  const kind = kindForMime(declaredMime);
  if (!kind) throw new ApiError(400, "UNSUPPORTED_FILE_TYPE", "Allowed: JPG, JPEG, PNG, WEBP images and PDF documents");
  const sniffed = sniffMime(head);
  if (sniffed !== declaredMime) throw new ApiError(400, "FILE_SIGNATURE_MISMATCH", "File content does not match its type");
  const maxMb = kind === "IMAGE" ? limits.imageMaxMb : limits.documentMaxMb;
  if (size <= 0 || size > maxMb * 1024 * 1024) {
    throw new ApiError(400, "FILE_TOO_LARGE", `Maximum size for this file type is ${maxMb} MB`);
  }
  return { kind, mime: declaredMime, ext: EXT_BY_MIME[declaredMime] };
}

/** Uploaded files are renamed; original names are stored only for display. */
export function secureFileName(ext: string): string {
  return `${randomUUID()}.${ext}`;
}

export function fileUrl(storedName: string): string {
  return `/api/files/${storedName}`;
}

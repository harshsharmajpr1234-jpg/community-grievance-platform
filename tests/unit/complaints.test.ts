import { describe, expect, it } from "vitest";
import { formatComplaintCode } from "@/server/services/complaints";
import { sniffMime, validateUploadBuffer } from "@/server/storage";
import { buildTimeline } from "@/shared/timeline";
import { COMPLAINT_CODE_REGEX } from "@/shared/constants";

describe("complaint codes", () => {
  it("formats human readable ids", () => {
    expect(formatComplaintCode(2026, 1)).toBe("JSM-2026-000001");
    expect(formatComplaintCode(2026, 123)).toBe("JSM-2026-000123");
    expect(COMPLAINT_CODE_REGEX.test(formatComplaintCode(2026, 999999))).toBe(true);
  });
});

describe("timeline", () => {
  const upd = (newStatus: string, day: number) => ({ id: String(day), type: "STATUS_CHANGE" as const, oldStatus: null, newStatus: newStatus as never, message: null, isPublic: true, byAdmin: null, byUser: false, createdAt: new Date(2026, 0, day) });
  it("marks reached steps done and current step", () => {
    const steps = buildTimeline([upd("SUBMITTED", 1), upd("VERIFIED", 2), upd("IN_PROGRESS", 3)], "IN_PROGRESS");
    expect(steps.find((s) => s.status === "SUBMITTED")?.state).toBe("done");
    expect(steps.find((s) => s.status === "IN_PROGRESS")?.state).toBe("current");
    expect(steps.find((s) => s.status === "RESOLVED")?.state).toBe("pending");
  });
  it("appends side statuses such as REJECTED", () => {
    const steps = buildTimeline([upd("SUBMITTED", 1), upd("REJECTED", 2)], "REJECTED");
    expect(steps[steps.length - 1].status).toBe("REJECTED");
  });
});

describe("upload validation", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const pdf = Buffer.from("%PDF-1.4 0000000000");
  it("detects magic bytes", () => {
    expect(sniffMime(jpeg)).toBe("image/jpeg");
    expect(sniffMime(pdf)).toBe("application/pdf");
    expect(sniffMime(Buffer.alloc(16))).toBeNull();
  });
  it("accepts matching type within limits", () => {
    expect(validateUploadBuffer("image/jpeg", 1024, jpeg).kind).toBe("IMAGE");
    expect(validateUploadBuffer("application/pdf", 1024, pdf).kind).toBe("DOCUMENT");
  });
  it("rejects spoofed types, unsupported types and oversize files", () => {
    expect(() => validateUploadBuffer("image/png", 1024, jpeg)).toThrow(/does not match/);
    expect(() => validateUploadBuffer("application/x-msdownload", 1024, jpeg)).toThrow(/Allowed/);
    expect(() => validateUploadBuffer("image/jpeg", 6 * 1024 * 1024, jpeg, { imageMaxMb: 5, documentMaxMb: 10 })).toThrow(/Maximum size/);
  });
});

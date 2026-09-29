import { describe, expect, it, vi } from "vitest";
import { StorageService } from "@/server/storage";
import { ATTACHMENT_RETENTION_DAYS } from "@/shared/constants";
import * as mongodb from "@/lib/mongodb";

describe("StorageService Retention & Abstraction", () => {
  it("defines default retention days as 90", () => {
    expect(ATTACHMENT_RETENTION_DAYS).toBe(90);
  });

  it("handles storage report aggregation structure", async () => {
    vi.spyOn(mongodb, "getCollection").mockResolvedValue({
      find: () => ({
        toArray: async () => [
          { fileId: "1", size: 1024, status: "ACTIVE", createdAt: new Date() },
          { fileId: "2", size: 2048, status: "DELETED", createdAt: new Date() },
        ],
      }),
    } as never);

    const report = await StorageService.getStorageReport();
    expect(report.totalFiles).toBe(1);
    expect(report.totalSizeBytes).toBe(1024);
    expect(report.successfullyDeletedCount).toBe(1);
  });
});

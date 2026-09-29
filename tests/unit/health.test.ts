import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import * as mongodb from "@/lib/mongodb";

describe("GET /api/health", () => {
  it("returns HTTP 200 when database is connected", async () => {
    vi.spyOn(mongodb, "pingDatabase").mockResolvedValue(true);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.database).toBe("mongodb");
  });

  it("returns HTTP 503 when database is unavailable", async () => {
    vi.spyOn(mongodb, "pingDatabase").mockResolvedValue(false);

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

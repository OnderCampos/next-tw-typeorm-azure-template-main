import { afterEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/infra/database", () => ({ db: { $queryRaw: query } }));

describe("GET /api/health", () => {
  afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("reports healthy when the mediated database query succeeds", async () => {
    const { GET } = await import("./route");
    query.mockResolvedValue(undefined);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "healthy" });
  });

  it("reports unhealthy when the mediated database query fails", async () => {
    const { GET } = await import("./route");
    query.mockRejectedValue(new Error("database unavailable"));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unhealthy", error: "Error: database unavailable" });
  });
});

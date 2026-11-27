import { afterEach, describe, expect, it, vi } from "vitest";

const findAll = vi.hoisted(() => vi.fn());
vi.mock("@/infra/repositories/UserRepository", () => ({ UserRepository: { findAll } }));

describe("GET /api/users", () => {
  afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("returns users supplied by the mediated repository", async () => {
    const { GET } = await import("./route");
    findAll.mockResolvedValue([{ id: 1, email: "ada@example.com" }]);
    const response = await GET({} as any);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: 1, email: "ada@example.com" }]);
  });

  it("does not expose repository errors", async () => {
    const { GET } = await import("./route");
    findAll.mockRejectedValue(new Error("database unavailable"));
    const response = await GET({} as any);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Error interno del servidor" });
  });
});

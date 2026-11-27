import { afterEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/infra/repositories/UserRepository", () => ({ UserRepository: repository }));

const request = (body?: unknown) => ({ json: vi.fn().mockResolvedValue(body) }) as any;
const user = { id: 1, email: "ada@example.com", name: "Ada" };

describe("/api/users/[id] handlers", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("gets a user, rejects an invalid id, and reports a missing user", async () => {
    const { GET } = await import("./route");
    repository.findById.mockResolvedValueOnce(user).mockResolvedValueOnce(null);

    const found = await GET(request(), { params: { id: "1" } });
    const invalid = await GET(request(), { params: { id: "not-a-number" } });
    const missing = await GET(request(), { params: { id: "2" } });

    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toEqual(user);
    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it("updates only when an id and update data are valid", async () => {
    const { PATCH } = await import("./route");
    repository.update.mockResolvedValue(user);

    const updated = await PATCH(request({ name: "Grace" }), { params: { id: "1" } });
    const noData = await PATCH(request({}), { params: { id: "1" } });
    const invalid = await PATCH(request({ name: "Grace" }), { params: { id: "x" } });

    expect(updated.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(1, { email: undefined, name: "Grace" });
    expect(noData.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("turns repository failures into server errors for every operation", async () => {
    const { DELETE, GET, PATCH } = await import("./route");
    repository.findById.mockRejectedValueOnce(new Error("database unavailable"));
    repository.update.mockRejectedValueOnce(new Error("database unavailable"));
    repository.delete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("database unavailable"));

    expect((await GET(request(), { params: { id: "1" } })).status).toBe(500);
    expect((await PATCH(request({ name: "Ada" }), { params: { id: "1" } })).status).toBe(500);
    const deleted = await DELETE(request(), { params: { id: "1" } });
    const failed = await DELETE(request(), { params: { id: "2" } });

    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toEqual({ message: "Usuario eliminado" });
    expect(failed.status).toBe(500);
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});

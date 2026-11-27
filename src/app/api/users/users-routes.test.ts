import { afterEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ findAll: vi.fn(), findById: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("@/infra/repositories/UserRepository", () => ({ UserRepository: repository }));

import { GET as list } from "./route";
import { DELETE, GET, PATCH } from "./[id]/route";

const request = (body?: unknown) => new Request("http://test/api", { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }) as never;
const params = (id: string) => ({ params: { id } });

afterEach(() => vi.clearAllMocks());

describe("user route mediators", () => {
  it("lists repository users and converts repository failures to 500", async () => {
    repository.findAll.mockResolvedValue([{ id: 1, email: "ada@example.com" }]);
    let response = await list({} as never);
    expect(await response.json()).toEqual([{ id: 1, email: "ada@example.com" }]);
    repository.findAll.mockRejectedValue(new Error("database unavailable"));
    response = await list({} as never);
    expect(response.status).toBe(500);
  });

  it("gets a user, rejects invalid ids, and reports missing users", async () => {
    let response = await GET({} as never, params("nope"));
    expect(response.status).toBe(400);
    repository.findById.mockResolvedValue(null);
    response = await GET({} as never, params("5"));
    expect(response.status).toBe(404);
    repository.findById.mockResolvedValue({ id: 5, email: "ada@example.com" });
    response = await GET({} as never, params("5"));
    expect(await response.json()).toEqual({ id: 5, email: "ada@example.com" });
  });

  it("updates only supplied user fields and validates update requests", async () => {
    let response = await PATCH(request({}), params("5"));
    expect(response.status).toBe(400);
    repository.update.mockResolvedValue({ id: 5, name: "Grace" });
    response = await PATCH(request({ name: "Grace" }), params("5"));
    expect(response.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(5, { email: undefined, name: "Grace" });
  });

  it("deletes valid users and does not invoke the repository for invalid ids", async () => {
    repository.delete.mockResolvedValue({ id: 5 });
    let response = await DELETE({} as never, params("5"));
    expect(await response.json()).toEqual({ message: "Usuario eliminado" });
    response = await DELETE({} as never, params("invalid"));
    expect(response.status).toBe(400);
    expect(repository.delete).toHaveBeenCalledTimes(1);
  });
});

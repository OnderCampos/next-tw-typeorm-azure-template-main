import { afterEach, describe, expect, it, vi } from "vitest";
import { createUser, getUsers, login, logout, uploadFile } from "./db";

const originalFetch = globalThis.fetch;
const fetchResponse = (ok: boolean, body: unknown) => ({ ok, json: vi.fn().mockResolvedValue(body) }) as Response;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("REST API client mediator", () => {
  it("sends create and list user requests through mocked fetch", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(fetchResponse(true, { id: "1", email: "ada@example.com" }))
      .mockResolvedValueOnce(fetchResponse(true, [{ id: "1" }]));
    globalThis.fetch = fetchSpy;

    await expect(createUser({ email: "ada@example.com", name: "Ada", password: "secret" })).resolves.toMatchObject({ id: "1" });
    await expect(getUsers()).resolves.toEqual([{ id: "1" }]);
    expect(fetchSpy).toHaveBeenNthCalledWith(1, "/api/users", expect.objectContaining({ method: "POST" }));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/users", expect.objectContaining({ method: "GET" }));
  });

  it("turns API failures into useful errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(fetchResponse(false, { error: "Email exists" }));
    await expect(createUser({ email: "a@b.com", name: "A", password: "x" })).rejects.toThrow("Email exists");
    await expect(login("a@b.com", "x")).rejects.toThrow("Login failed");
  });

  it("uses mocked fetch for logout and multipart upload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(fetchResponse(true, { success: true }));
    globalThis.fetch = fetchSpy;
    await expect(logout()).resolves.toEqual({ success: true });
    await expect(uploadFile(new File(["hello"], "hello.txt", { type: "text/plain" }), "1")).resolves.toEqual({ success: true });
    expect(fetchSpy).toHaveBeenNthCalledWith(1, "/api/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/storage/upload", expect.objectContaining({ method: "POST" }));
  });
});

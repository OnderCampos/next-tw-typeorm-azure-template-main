import { afterEach, describe, expect, it, vi } from "vitest";
import { createUser, getUsers, login, logout, uploadFile } from "./db";

describe("REST API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a user and returns the API response", async () => {
    const user = { id: "1", name: "Ada", email: "ada@example.com", createdAt: "today" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(user) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createUser({ name: "Ada", email: "ada@example.com", password: "Secret123" })).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com", password: "Secret123" }),
    }));
  });

  it("uses the server error message when creating a user fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ error: "Email taken" }) }));

    await expect(createUser({ name: "Ada", email: "ada@example.com", password: "Secret123" })).rejects.toThrow("Email taken");
  });

  it("gets users and reports a failed users response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getUsers()).resolves.toEqual([]);
    await expect(getUsers()).rejects.toThrow("Failed to fetch users");
    expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.objectContaining({ method: "GET" }));
  });

  it("logs in, logs out, and uploads with mediated fetch responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "1" }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ url: "https://blob.test/file" }) });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["content"], "note.txt", { type: "text/plain" });

    await expect(login("ada@example.com", "Secret123")).resolves.toEqual({ id: "1" });
    await expect(logout()).resolves.toEqual({ success: true });
    await expect(uploadFile(file, "1")).resolves.toEqual({ url: "https://blob.test/file" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/login");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/logout");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/storage/upload");
  });

  it("reports login, logout, and upload failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: vi.fn().mockResolvedValue({ error: { message: "Bad credentials" } }) })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("ada@example.com", "wrong")).rejects.toThrow("Bad credentials");
    await expect(logout()).rejects.toThrow("Failed to logout");
    await expect(uploadFile(new File(["x"], "x.txt"), "1")).rejects.toThrow("Failed to upload file");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const verifyToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/utils/jwt.utils", () => ({ COOKIE_NAME: "auth_token", verifyToken }));
const request = (token?: string) => ({ cookies: { get: vi.fn().mockReturnValue(token ? { value: token } : undefined) } }) as any;

describe("GET /api/auth/me", () => {
  afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("rejects missing and invalid tokens, clearing invalid cookies", async () => {
    const { GET } = await import("./route");
    expect((await GET(request())).status).toBe(401);
    verifyToken.mockReturnValue(null);
    const invalid = await GET(request("bad-token"));
    expect(invalid.status).toBe(401);
    expect(invalid.headers.get("set-cookie")).toContain("auth_token=");
  });

  it("returns the authenticated user from a verified token", async () => {
    const { GET } = await import("./route");
    verifyToken.mockReturnValue({ sub: "1", email: "ada@example.com", name: "Ada" });
    const response = await GET(request("valid-token"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: { id: "1", email: "ada@example.com", name: "Ada" } });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ findByEmail: vi.fn(), verifyPassword: vi.fn(), signToken: vi.fn() }));
vi.mock("@/infra/repositories/UserRepository", () => ({ UserRepository: { findByEmail: deps.findByEmail } }));
vi.mock("@/domain/services/UserService", () => ({ UserService: { verifyPassword: deps.verifyPassword } }));
vi.mock("@/lib/utils/jwt.utils", () => ({ COOKIE_NAME: "auth_token", TOKEN_TTL_SECONDS: 60, signToken: deps.signToken }));
const request = (body: unknown) => ({ json: vi.fn().mockResolvedValue(body) }) as any;

describe("POST /api/auth/login", () => {
  afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("rejects missing credentials, unknown users, and invalid passwords", async () => {
    const { POST } = await import("./route");
    expect((await POST(request({}))).status).toBe(400);
    deps.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1, email: "ada@example.com", name: "Ada", hashedPassword: "hash" });
    deps.verifyPassword.mockResolvedValue(false);
    expect((await POST(request({ email: "ada@example.com", password: "wrong" }))).status).toBe(401);
    expect((await POST(request({ email: "ada@example.com", password: "wrong" }))).status).toBe(401);
  });

  it("sets an httpOnly session cookie for valid credentials and handles failures", async () => {
    const { POST } = await import("./route");
    deps.findByEmail.mockResolvedValue({ id: 1, email: "ada@example.com", name: "Ada", hashedPassword: "hash" });
    deps.verifyPassword.mockResolvedValue(true);
    deps.signToken.mockReturnValue("test-token");
    const response = await POST(request({ email: "ada@example.com", password: "Secret123" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("auth_token=test-token");
    expect(deps.signToken).toHaveBeenCalledWith({ sub: "1", email: "ada@example.com", name: "Ada" });
    deps.findByEmail.mockRejectedValueOnce(new Error("db down"));
    expect((await POST(request({ email: "ada@example.com", password: "Secret123" }))).status).toBe(500);
  });
});

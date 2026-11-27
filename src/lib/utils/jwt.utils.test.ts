import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("JWT utility", () => {
  it("signs and verifies a token using an isolated mock secret", async () => {
    process.env = { ...originalEnv, JWT_SECRET: "test-mock-key" };
    vi.resetModules();
    const { signToken, verifyToken, TOKEN_TTL_SECONDS } = await import("./jwt.utils");
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const token = signToken({ sub: "42", email: "ada@example.com", name: "Ada" });
    expect(verifyToken(token)).toEqual({ sub: "42", email: "ada@example.com", name: "Ada", iat: 1_700_000_000, exp: 1_700_000_000 + TOKEN_TTL_SECONDS });
    now.mockRestore();
  });

  it("rejects malformed, tampered, and expired tokens", async () => {
    process.env = { ...originalEnv, JWT_SECRET: "test-mock-key" };
    const { signToken, verifyToken } = await import("./jwt.utils");
    expect(verifyToken("not-a-token")).toBeNull();
    const token = signToken({ sub: "42", email: "ada@example.com", name: "Ada" });
    expect(verifyToken(`${token}tampered`)).toBeNull();
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(verifyToken(token)).toBeNull();
  });
});

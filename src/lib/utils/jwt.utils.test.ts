import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("JWT utilities", () => {
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("signs and verifies a token using a mediated test secret", async () => {
    process.env = { ...originalEnv, JWT_SECRET: "test-mock-key" };
    vi.resetModules();
    const { signToken, verifyToken } = await import("./jwt.utils");
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const token = signToken({ sub: "42", email: "ada@example.com", name: "Ada" });

    expect(verifyToken(token)).toMatchObject({ sub: "42", email: "ada@example.com", name: "Ada", iat: 1_700_000_000 });
  });

  it("rejects missing, tampered, malformed, and expired tokens", async () => {
    process.env = { ...originalEnv, JWT_SECRET: "test-mock-key" };
    vi.resetModules();
    const { signToken, verifyToken } = await import("./jwt.utils");
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const valid = signToken({ sub: "42", email: "ada@example.com", name: "Ada" });
    const [payload] = valid.split(".");
    const expiredPayload = Buffer.from(JSON.stringify({ sub: "42", email: "ada@example.com", name: "Ada", iat: 1, exp: 2 })).toString("base64url");

    expect(verifyToken("")).toBeNull();
    expect(verifyToken(`${payload}.tampered`)).toBeNull();
    expect(verifyToken("not-base64.signature")).toBeNull();
    expect(verifyToken(`${expiredPayload}.${valid.split(".")[1]}`)).toBeNull();
  });
});

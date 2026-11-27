import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  validateEmail: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("@/infra/repositories/UserRepository", () => ({
  UserRepository: {
    findByEmail: mocks.findByEmail,
    create: mocks.create,
  },
}));
vi.mock("@/domain/services/UserService", () => ({
  UserService: {
    validateEmail: mocks.validateEmail,
    hashPassword: mocks.hashPassword,
    verifyPassword: mocks.verifyPassword,
  },
}));
vi.mock("@/lib/utils/jwt.utils", () => ({
  COOKIE_NAME: "auth_token",
  TOKEN_TTL_SECONDS: 604800,
  signToken: mocks.signToken,
  verifyToken: mocks.verifyToken,
}));

import { POST as login } from "./login/route";
import { GET as me } from "./me/route";
import { POST as signup } from "./signup/route";

const request = (body: unknown) => new Request("http://test/api", { method: "POST", body: JSON.stringify(body) }) as never;

afterEach(() => vi.clearAllMocks());

describe("authentication route mediators", () => {
  it("creates a valid new user after mediating repository and password services", async () => {
    mocks.validateEmail.mockReturnValue(true);
    mocks.findByEmail.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("mock-hash");
    mocks.create.mockResolvedValue({ id: 7, email: "ada@example.com", name: "Ada" });

    const response = await signup(request({ email: "ada@example.com", name: "Ada", password: "secret" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: 7, message: "Usuario creado exitosamente" });
    expect(mocks.create).toHaveBeenCalledWith("ada@example.com", "Ada", "mock-hash");
  });

  it("rejects incomplete, invalid, and duplicate signup requests without creating records", async () => {
    let response = await signup(request({ email: "ada@example.com" }));
    expect(response.status).toBe(400);
    mocks.validateEmail.mockReturnValue(false);
    response = await signup(request({ email: "bad", password: "secret" }));
    expect(await response.json()).toEqual({ error: "Email inválido" });
    mocks.validateEmail.mockReturnValue(true);
    mocks.findByEmail.mockResolvedValue({ id: 7 });
    response = await signup(request({ email: "ada@example.com", password: "secret" }));
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("logs in verified users and sets the http-only auth cookie", async () => {
    mocks.findByEmail.mockResolvedValue({ id: 2, email: "ada@example.com", name: "Ada", hashedPassword: "hash" });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.signToken.mockReturnValue("signed-token");

    const response = await login(request({ email: "ada@example.com", password: "secret" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 2, message: "Login exitoso" });
    expect(mocks.verifyPassword).toHaveBeenCalledWith("secret", "hash");
    expect(response.headers.get("set-cookie")).toContain("auth_token=signed-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("does not issue a token for unknown or invalid credentials", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    let response = await login(request({ email: "none@example.com", password: "secret" }));
    expect(response.status).toBe(401);
    mocks.findByEmail.mockResolvedValue({ hashedPassword: "hash" });
    mocks.verifyPassword.mockResolvedValue(false);
    response = await login(request({ email: "ada@example.com", password: "wrong" }));
    expect(response.status).toBe(401);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it("returns authenticated token payloads and clears invalid cookies", async () => {
    mocks.verifyToken.mockReturnValue({ sub: "2", email: "ada@example.com", name: "Ada" });
    let response = await me({ cookies: { get: vi.fn().mockReturnValue({ value: "valid" }) } } as never);
    expect(await response.json()).toEqual({ user: { id: "2", email: "ada@example.com", name: "Ada" } });

    mocks.verifyToken.mockReturnValue(null);
    response = await me({ cookies: { get: vi.fn().mockReturnValue({ value: "bad" }) } } as never);
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("auth_token=;");
  });
});

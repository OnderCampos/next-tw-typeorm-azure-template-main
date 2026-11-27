import { afterEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  validateEmail: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/infra/repositories/UserRepository", () => ({
  UserRepository: { findByEmail: dependencies.findByEmail, create: dependencies.create },
}));
vi.mock("@/domain/services/UserService", () => ({
  UserService: { validateEmail: dependencies.validateEmail, hashPassword: dependencies.hashPassword },
}));

const request = (body: unknown) => ({ json: vi.fn().mockResolvedValue(body) }) as any;

describe("POST /api/auth/signup", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("rejects missing data, invalid email, and an existing account", async () => {
    const { POST } = await import("./route");
    dependencies.validateEmail.mockReturnValue(false);
    dependencies.findByEmail.mockResolvedValue({ id: 1 });

    expect((await POST(request({}))).status).toBe(400);
    expect((await POST(request({ email: "bad", password: "Secret123" }))).status).toBe(400);
    dependencies.validateEmail.mockReturnValue(true);
    expect((await POST(request({ email: "ada@example.com", password: "Secret123" }))).status).toBe(409);
  });

  it("hashes, persists, and returns a newly registered user", async () => {
    const { POST } = await import("./route");
    dependencies.validateEmail.mockReturnValue(true);
    dependencies.findByEmail.mockResolvedValue(null);
    dependencies.hashPassword.mockResolvedValue("password-hash");
    dependencies.create.mockResolvedValue({ id: 1, email: "ada@example.com", name: "Ada" });

    const response = await POST(request({ email: "ada@example.com", name: "Ada", password: "Secret123" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: 1, message: "Usuario creado exitosamente" });
    expect(dependencies.create).toHaveBeenCalledWith("ada@example.com", "Ada", "password-hash");
  });

  it("does not expose repository failures", async () => {
    const { POST } = await import("./route");
    dependencies.validateEmail.mockReturnValue(true);
    dependencies.findByEmail.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ email: "ada@example.com", password: "Secret123" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Error interno del servidor" });
  });
});

import { describe, expect, it, vi } from "vitest";

const bcrypt = vi.hoisted(() => ({ hash: vi.fn(), compare: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: bcrypt }));

import { UserService } from "./UserService";

describe("UserService", () => {
  it("validates standard email addresses", () => {
    expect(UserService.validateEmail("ada@example.com")).toBe(true);
    expect(UserService.validateEmail("invalid-email")).toBe(false);
  });

  it("mediates bcrypt operations and creates validated users", async () => {
    bcrypt.hash.mockResolvedValue("mock-hash");
    bcrypt.compare.mockResolvedValue(true);
    await expect(UserService.hashPassword("secret")).resolves.toBe("mock-hash");
    await expect(UserService.verifyPassword("secret", "mock-hash")).resolves.toBe(true);
    await expect(UserService.createUser("ada@example.com", "secret")).resolves.toEqual({ email: "ada@example.com", hashedPassword: "mock-hash" });
    expect(bcrypt.hash).toHaveBeenCalledWith("secret", 10);
  });

  it("rejects invalid emails before hashing", async () => {
    await expect(UserService.createUser("invalid", "secret")).rejects.toThrow("Invalid email");
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});

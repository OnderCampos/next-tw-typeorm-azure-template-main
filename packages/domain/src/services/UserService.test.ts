import { afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { UserService } from "./UserService";

describe("UserService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates well-formed email addresses and rejects malformed ones", () => {
    expect(UserService.validateEmail("person@example.com")).toBe(true);
    expect(UserService.validateEmail("not-an-email")).toBe(false);
    expect(UserService.validateEmail("person@localhost")).toBe(false);
  });

  it("hashes and verifies passwords through bcrypt", async () => {
    const hashSpy = vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValue(true);

    await expect(UserService.hashPassword("secret123")).resolves.toBe("hashed-password");
    await expect(UserService.verifyPassword("secret123", "stored-hash")).resolves.toBe(true);

    expect(hashSpy).toHaveBeenCalledWith("secret123", 10);
    expect(compareSpy).toHaveBeenCalledWith("secret123", "stored-hash");
  });

  it("creates a user with a hashed password and rejects invalid email before hashing", async () => {
    const hashSpy = vi.spyOn(UserService, "hashPassword").mockResolvedValue("hash");

    await expect(UserService.createUser("person@example.com", "secret123")).resolves.toEqual({
      email: "person@example.com",
      hashedPassword: "hash",
    });
    await expect(UserService.createUser("invalid", "secret123")).rejects.toThrow("Invalid email");
    expect(hashSpy).toHaveBeenCalledTimes(1);
  });
});

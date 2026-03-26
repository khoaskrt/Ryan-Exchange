import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  createSessionToken: vi.fn(async () => "mock-token"),
  hashPassword: vi.fn(async () => "hashed-password"),
  verifyPassword: vi.fn(async (plain: string, hashed: string) => plain === "StrongPass@123" && hashed === "stored-hash"),
}));

vi.mock("@/lib/server/auth/auth.repository", () => ({
  findUserByEmail: vi.fn(),
  findUserForLogin: vi.fn(),
  createUserWithWallet: vi.fn(),
  updateLastLoginAt: vi.fn(),
}));

vi.mock("@/lib/server/invite", () => ({
  validateInviteCode: vi.fn(async () => true),
}));

vi.mock("@/lib/server/wallet", () => ({
  seedPaperWallet: vi.fn(),
}));

import { AuthError } from "@/lib/server/auth/auth.errors";
import { login, signup } from "@/lib/server/auth/auth.service";
import {
  createUserWithWallet,
  findUserByEmail,
  findUserForLogin,
  updateLastLoginAt,
} from "@/lib/server/auth/auth.repository";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signup success creates user and does not issue token by default", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createUserWithWallet).mockResolvedValue({
      id: "user_1",
      name: "Nguyen Van A",
      email: "user@example.com",
      country: "Vietnam",
    });

    const result = await signup({
      country: "Vietnam",
      fullName: "Nguyen Van A",
      email: "user@example.com",
      password: "StrongPass@123",
      referralCode: undefined,
    });

    expect(result.user.id).toBe("user_1");
    expect(result.token).toBeUndefined();
  });

  it("signup duplicate email throws AUTH_EMAIL_EXISTS", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({ id: "existing" } as never);

    await expect(
      signup({
        country: "Vietnam",
        fullName: "Nguyen Van A",
        email: "user@example.com",
        password: "StrongPass@123",
        referralCode: undefined,
      }),
    ).rejects.toMatchObject({
      code: "AUTH_EMAIL_EXISTS",
      message: "Email already existed, please use another email",
    });
  });

  it("login returns generic invalid credentials when user does not exist", async () => {
    vi.mocked(findUserForLogin).mockResolvedValue(null);

    await expect(login({ email: "missing@example.com", password: "StrongPass@123" })).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  });

  it("login returns generic invalid credentials on wrong password", async () => {
    vi.mocked(findUserForLogin).mockResolvedValue({
      id: "user_1",
      name: "Nguyen Van A",
      email: "user@example.com",
      passwordHash: "stored-hash",
      accountStatus: "ACTIVE",
    } as never);

    await expect(login({ email: "user@example.com", password: "WrongPass@123" })).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  });

  it("login success updates lastLoginAt and returns token", async () => {
    vi.mocked(findUserForLogin).mockResolvedValue({
      id: "user_1",
      name: "Nguyen Van A",
      email: "user@example.com",
      passwordHash: "stored-hash",
      accountStatus: "ACTIVE",
    } as never);

    const result = await login({
      email: "user@example.com",
      password: "StrongPass@123",
    });

    expect(result.user.userId).toBe("user_1");
    expect(result.token).toBe("mock-token");
    expect(updateLastLoginAt).toHaveBeenCalledWith("user_1");
  });

  it("login rejects disabled account", async () => {
    vi.mocked(findUserForLogin).mockResolvedValue({
      id: "user_2",
      name: "Nguyen Van B",
      email: "disabled@example.com",
      passwordHash: "stored-hash",
      accountStatus: "DISABLED",
    } as never);

    await expect(login({ email: "disabled@example.com", password: "StrongPass@123" })).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("AUTH_ACCOUNT_DISABLED");
      return true;
    });
  });
});

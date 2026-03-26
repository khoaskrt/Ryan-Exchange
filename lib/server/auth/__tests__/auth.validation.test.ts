import { describe, expect, it } from "vitest";

import { AuthError } from "@/lib/server/auth/auth.errors";
import { parseSignupRequest } from "@/lib/server/auth/auth.validation";

describe("auth.validation signup", () => {
  it("accepts valid signup payload", () => {
    const parsed = parseSignupRequest({
      country: "Vietnam",
      fullName: "Nguyen Van A",
      email: "USER@example.com",
      password: "StrongPass@123",
      referralCode: "RYAN2026",
    });

    expect(parsed.email).toBe("user@example.com");
    expect(parsed.referralCode).toBe("RYAN2026");
  });

  it("rejects unsupported country", () => {
    expect(() =>
      parseSignupRequest({
        country: "Singapore",
        fullName: "Nguyen Van A",
        email: "user@example.com",
        password: "StrongPass@123",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "AUTH_UNSUPPORTED_COUNTRY",
      }),
    );
  });

  it("returns weak password code for weak password", () => {
    try {
      parseSignupRequest({
        country: "Vietnam",
        fullName: "Nguyen Van A",
        email: "user@example.com",
        password: "weakpass",
      });
      throw new Error("expected error");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("AUTH_WEAK_PASSWORD");
    }
  });

  it("returns invalid request code for malformed email", () => {
    try {
      parseSignupRequest({
        country: "Vietnam",
        fullName: "Nguyen Van A",
        email: "not-an-email",
        password: "StrongPass@123",
      });
      throw new Error("expected error");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("AUTH_INVALID_REQUEST");
    }
  });
});

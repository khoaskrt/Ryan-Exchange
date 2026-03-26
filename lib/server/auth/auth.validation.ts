import { z } from "zod";

import { AUTH_ERROR_CODES, AuthError } from "@/lib/server/auth/auth.errors";

export const AUTH_ALLOWED_COUNTRY = "Vietnam";

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters.")
  .max(100, "Full name must be fewer than 100 characters.")
  .regex(/^[A-Za-zÀ-ỹ\s'.-]+$/, "Please enter your full name.");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(64, "Password must be fewer than 64 characters.")
  .regex(/[a-z]/, "Password must include at least one lowercase character.")
  .regex(/[A-Z]/, "Password must include at least one uppercase character.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

const referralCodeSchema = z
  .string()
  .trim()
  .max(50, "Referral code format is invalid.")
  .regex(/^[A-Za-z0-9]+$/, "Referral code format is invalid.");

export const signupRequestSchema = z
  .object({
    country: z.string().trim().min(1, "Please select your country or region to continue."),
    fullName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().trim().email("Please enter a valid email address.").max(254),
    password: passwordSchema,
    referralCode: z.string().optional(),
    inviteCode: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const candidateName = data.fullName ?? data.name ?? "";
    const nameCheck = fullNameSchema.safeParse(candidateName);
    if (!nameCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: nameCheck.error.issues[0]?.message ?? "Please enter your full name.",
        path: ["fullName"],
      });
    }

    const referralCandidate = (data.referralCode ?? data.inviteCode ?? "").trim();
    if (referralCandidate.length > 0) {
      const referralCheck = referralCodeSchema.safeParse(referralCandidate);
      if (!referralCheck.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Referral code format is invalid.",
          path: ["referralCode"],
        });
      }
    }
  })
  .transform((data) => ({
    country: data.country.trim(),
    fullName: (data.fullName ?? data.name ?? "").trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    referralCode: (data.referralCode ?? data.inviteCode ?? "").trim().toUpperCase() || undefined,
  }));

export const loginRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  password: z.string().min(1, "Password is required.").max(64),
});

export const registerProfileRequestSchema = z
  .object({
    country: z.string().trim().min(1, "Please select your country or region to continue."),
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").max(100),
    referralCode: z.string().optional(),
  })
  .transform((data) => ({
    country: data.country.trim(),
    fullName: data.fullName.trim(),
    referralCode: data.referralCode?.trim().toUpperCase() || undefined,
  }));

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterProfileRequest = z.infer<typeof registerProfileRequestSchema>;

export function parseSignupRequest(body: unknown): SignupRequest {
  const parsed = signupRequestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const passwordIssue = parsed.error.issues.some(
      (issue) =>
        issue.path.includes("password") ||
        String(issue.message).toLowerCase().includes("password"),
    );

    throw new AuthError(
      passwordIssue ? AUTH_ERROR_CODES.WEAK_PASSWORD : AUTH_ERROR_CODES.INVALID_REQUEST,
      firstIssue?.message ?? "Invalid request payload.",
      400,
    );
  }

  if (parsed.data.country !== AUTH_ALLOWED_COUNTRY) {
    throw new AuthError(
      AUTH_ERROR_CODES.UNSUPPORTED_COUNTRY,
      "Registration is currently available only for Vietnam.",
      400,
    );
  }

  return parsed.data;
}

export function parseLoginRequest(body: unknown): LoginRequest {
  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.INVALID_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid request payload.",
      400,
    );
  }

  return {
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  };
}

export function parseRegisterProfileRequest(body: unknown): RegisterProfileRequest {
  const parsed = registerProfileRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.INVALID_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid request payload.",
      400,
    );
  }

  return parsed.data;
}

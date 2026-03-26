import { AccountStatus } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { createSessionToken, hashPassword, verifyPassword } from "@/lib/server/auth";
import { AUTH_ERROR_CODES, AuthError } from "@/lib/server/auth/auth.errors";
import type { LoginRequest, SignupRequest } from "@/lib/server/auth/auth.validation";
import {
  createUserWithWallet,
  findUserByEmail,
  findUserForLogin,
  updateLastLoginAt,
} from "@/lib/server/auth/auth.repository";
import { validateInviteCode } from "@/lib/server/invite";
import { seedPaperWallet } from "@/lib/server/wallet";

type SignupOptions = {
  issueSession?: boolean;
};

export async function signup(input: SignupRequest, options: SignupOptions = {}) {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw new AuthError(
      AUTH_ERROR_CODES.EMAIL_EXISTS,
      "Email already existed, please use another email",
      409,
    );
  }

  if (input.referralCode) {
    const referralValid = await validateInviteCode(input.referralCode);
    if (!referralValid) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_REQUEST,
        "Referral code format is invalid.",
        400,
      );
    }
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await createUserWithWallet(
      {
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        country: input.country,
        referralCode: input.referralCode,
      },
      seedPaperWallet,
    );
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(
        AUTH_ERROR_CODES.EMAIL_EXISTS,
        "Email already existed, please use another email",
        409,
      );
    }
    throw error;
  }

  return {
    user,
    token: options.issueSession
      ? await createSessionToken({
          sub: user.id,
          email: user.email,
          name: user.name,
        })
      : undefined,
  };
}

export async function login(input: LoginRequest) {
  const user = await findUserForLogin(input.email);

  if (!user) {
    throw new AuthError(
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid email or password.",
      401,
    );
  }

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw new AuthError(
      AUTH_ERROR_CODES.ACCOUNT_DISABLED,
      "Your account is not active. Please contact support.",
      403,
    );
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthError(
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid email or password.",
      401,
    );
  }

  await updateLastLoginAt(user.id);

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  return {
    user: {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
}

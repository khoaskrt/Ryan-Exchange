import { AccountStatus, AppUserStatus } from "@prisma/client";

import { createSessionToken } from "@/lib/server/auth";
import { AUTH_ALLOWED_COUNTRY } from "@/lib/server/auth/auth.validation";
import { AUTH_ERROR_CODES, AuthError } from "@/lib/server/auth/auth.errors";
import {
  activateUserAppStatus,
  findUserByFirebaseUid,
  registerAppProfile,
} from "@/lib/server/auth/auth.repository";
import { getFirebaseUserByUid, verifyFirebaseIdToken } from "@/lib/server/firebase-admin";

export type RegisterProfileInput = {
  fullName: string;
  country: string;
  referralCode?: string;
};

export type AuthStatusReason =
  | "OK"
  | "UNAUTHENTICATED"
  | "PROFILE_NOT_FOUND"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "APP_ACCESS_RESTRICTED";

export async function verifyFirebaseBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new AuthError(AUTH_ERROR_CODES.UNAUTHORIZED, "Missing bearer token.", 401);
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new AuthError(AUTH_ERROR_CODES.UNAUTHORIZED, "Missing bearer token.", 401);
  }

  try {
    return await verifyFirebaseIdToken(idToken);
  } catch {
    throw new AuthError(AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid or expired authentication token.", 401);
  }
}

export async function registerProfileFromFirebase(
  firebaseToken: Awaited<ReturnType<typeof verifyFirebaseBearerToken>>,
  input: RegisterProfileInput,
) {
  if (input.country !== AUTH_ALLOWED_COUNTRY) {
    throw new AuthError(
      AUTH_ERROR_CODES.COUNTRY_NOT_SUPPORTED,
      "Registration is currently available only for Vietnam.",
      400,
    );
  }

  const email = firebaseToken.email?.trim().toLowerCase();
  if (!email) {
    throw new AuthError(AUTH_ERROR_CODES.INVALID_REQUEST, "Authenticated user email is missing.", 400);
  }

  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new AuthError(AUTH_ERROR_CODES.INVALID_REQUEST, "Full name is required.", 400);
  }

  const user = await registerAppProfile({
    firebaseUid: firebaseToken.uid,
    email,
    fullName,
    country: input.country,
    referralCode: input.referralCode,
  });

  return {
    appUserId: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    appStatus: toAppStatusLabel(user.appStatus),
  };
}

export async function resolveAuthStatus(firebaseToken: Awaited<ReturnType<typeof verifyFirebaseBearerToken>>) {
  const user = await findUserByFirebaseUid(firebaseToken.uid);
  if (!user) {
    return {
      isAuthenticated: true,
      firebaseUid: firebaseToken.uid,
      emailVerified: Boolean(firebaseToken.email_verified),
      appStatus: null,
      access: {
        allowed: false,
        reason: "PROFILE_NOT_FOUND" as AuthStatusReason,
      },
      sessionToken: null,
    };
  }

  const emailVerified = await resolveEmailVerified(firebaseToken.uid, Boolean(firebaseToken.email_verified));
  let appStatus = user.appStatus;

  if (emailVerified && appStatus === AppUserStatus.PENDING_EMAIL_VERIFICATION) {
    const activated = await activateUserAppStatus(user.id);
    appStatus = activated.appStatus;
  }

  const accountActive = user.accountStatus === AccountStatus.ACTIVE;
  const allowed = emailVerified && appStatus === AppUserStatus.ACTIVE && accountActive;

  let reason: AuthStatusReason = "OK";
  if (!emailVerified) {
    reason = "EMAIL_VERIFICATION_REQUIRED";
  } else if (!allowed) {
    reason = "APP_ACCESS_RESTRICTED";
  }

  const sessionToken = allowed
    ? await createSessionToken({
        sub: user.id,
        email: user.email,
        name: user.name,
      })
    : null;

  return {
    isAuthenticated: true,
    firebaseUid: firebaseToken.uid,
    emailVerified,
    appStatus: toAppStatusLabel(appStatus),
    access: {
      allowed,
      reason,
    },
    sessionToken,
  };
}

async function resolveEmailVerified(uid: string, fallbackFromToken: boolean) {
  try {
    const firebaseUser = await getFirebaseUserByUid(uid);
    return Boolean(firebaseUser.emailVerified);
  } catch {
    return fallbackFromToken;
  }
}

function toAppStatusLabel(status: AppUserStatus) {
  switch (status) {
    case AppUserStatus.ACTIVE:
      return "active";
    case AppUserStatus.PENDING_EMAIL_VERIFICATION:
      return "pending_email_verification";
    case AppUserStatus.RESTRICTED:
      return "restricted";
    case AppUserStatus.SUSPENDED:
      return "suspended";
    default:
      return "restricted";
  }
}

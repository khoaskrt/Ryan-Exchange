import { SESSION_EXPIRES_IN_SECONDS, sessionCookieConfig } from "@/lib/server/auth";
import { AUTH_AUDIT_EVENT_TYPE, AUTH_AUDIT_STATUS } from "@/lib/server/auth/auth.audit-events";
import { AUTH_ERROR_CODES, isAuthError } from "@/lib/server/auth/auth.errors";
import {
  registerProfileFromFirebase,
  resolveAuthStatus,
  verifyFirebaseBearerToken,
} from "@/lib/server/auth/firebase-auth.service";
import { authErrorResponse, authSuccessResponse } from "@/lib/server/auth/auth.response";
import { login, signup } from "@/lib/server/auth/auth.service";
import {
  parseLoginRequest,
  parseRegisterProfileRequest,
  parseSignupRequest,
} from "@/lib/server/auth/auth.validation";
import { recordAuthAudit } from "@/lib/server/audit";
import { env } from "@/lib/server/env";

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function signupController(request: Request) {
  let parsedEmail: string | undefined;
  let parsedCountry: string | undefined;

  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return authErrorResponse("Invalid JSON payload.", AUTH_ERROR_CODES.INVALID_REQUEST, 400);
    }

    const input = parseSignupRequest(body);
    parsedEmail = input.email;
    parsedCountry = input.country;
    const signupAutoLoginEnabled = env.AUTH_SIGNUP_AUTO_LOGIN_ENABLED;

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_ATTEMPT,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: input.email,
      country: input.country,
    });

    const result = await signup(input, { issueSession: signupAutoLoginEnabled });

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_SUCCESS,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: input.email,
      country: input.country,
      userId: result.user.id,
    });

    const response = authSuccessResponse(
      "Account created successfully.",
      {
        userId: result.user.id,
        email: result.user.email,
        country: result.user.country,
        nextAction: signupAutoLoginEnabled
          ? { type: "GO_TO_DASHBOARD", path: "/dashboard" }
          : { type: "GO_TO_LOGIN", path: "/login" },
        authState: {
          authenticated: signupAutoLoginEnabled,
          sessionIssued: signupAutoLoginEnabled,
        },
        supportedPostSignupFlows: [
          "REGISTRATION_SUCCESS_ONLY",
          "REGISTRATION_SUCCESS_WITH_AUTO_LOGIN",
          "REGISTRATION_SUCCESS_WITH_NEXT_ACTION_HINT",
        ],
      },
      201,
    );

    if (result.token) {
      response.cookies.set({ ...sessionCookieConfig, value: result.token });
    }

    return response;
  } catch (error) {
    const isKnown = isAuthError(error);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_FAILURE,
      status: AUTH_AUDIT_STATUS.FAILURE,
      email: parsedEmail,
      country: parsedCountry,
      errorCode: isKnown ? error.code : AUTH_ERROR_CODES.SERVER_ERROR,
    });

    if (isKnown) {
      return authErrorResponse(error.message, error.code, error.status);
    }

    console.error("Signup error", error);
    return authErrorResponse(
      "Something went wrong. Please try again later.",
      AUTH_ERROR_CODES.SERVER_ERROR,
      500,
    );
  }
}

export async function loginController(request: Request) {
  let parsedEmail: string | undefined;

  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return authErrorResponse("Invalid JSON payload.", AUTH_ERROR_CODES.INVALID_REQUEST, 400);
    }

    const input = parseLoginRequest(body);
    parsedEmail = input.email;

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_ATTEMPT,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: input.email,
    });

    const result = await login(input);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_SUCCESS,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: input.email,
      userId: result.user.userId,
    });

    const response = authSuccessResponse(
      "Login successful.",
      {
        user: result.user,
        session: {
          strategy: "COOKIE_JWT",
          expiresInSeconds: SESSION_EXPIRES_IN_SECONDS,
        },
      },
      200,
    );

    response.cookies.set({ ...sessionCookieConfig, value: result.token });

    return response;
  } catch (error) {
    const isKnown = isAuthError(error);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_FAILURE,
      status: AUTH_AUDIT_STATUS.FAILURE,
      email: parsedEmail,
      errorCode: isKnown ? error.code : AUTH_ERROR_CODES.SERVER_ERROR,
    });

    if (isKnown) {
      return authErrorResponse(error.message, error.code, error.status);
    }

    console.error("Login error", error);
    return authErrorResponse(
      "Something went wrong. Please try again later.",
      AUTH_ERROR_CODES.SERVER_ERROR,
      500,
    );
  }
}

export async function ssoUnavailableController(provider: string) {
  await recordAuthAudit({
    eventType: AUTH_AUDIT_EVENT_TYPE.SSO_CLICK_UNAVAILABLE,
    status: AUTH_AUDIT_STATUS.FAILURE,
    providerLabel: provider,
    errorCode: AUTH_ERROR_CODES.SSO_UNAVAILABLE,
  });

  return authErrorResponse(
    `SSO provider '${provider}' is not available in v1.0.`,
    AUTH_ERROR_CODES.SSO_UNAVAILABLE,
    501,
  );
}

export async function registerProfileController(request: Request) {
  let parsedCountry: string | undefined;
  let parsedEmail: string | undefined;

  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return authErrorResponse("Invalid JSON payload.", AUTH_ERROR_CODES.INVALID_REQUEST, 400);
    }

    const input = parseRegisterProfileRequest(body);
    parsedCountry = input.country;

    const firebaseToken = await verifyFirebaseBearerToken(request);
    parsedEmail = firebaseToken.email?.toLowerCase();

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_ATTEMPT,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: parsedEmail,
      country: parsedCountry,
    });

    const data = await registerProfileFromFirebase(firebaseToken, input);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_SUCCESS,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: parsedEmail,
      country: parsedCountry,
      userId: data.appUserId,
    });

    return authSuccessResponse("Profile registered successfully.", data, 201);
  } catch (error) {
    const isKnown = isAuthError(error);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.SIGNUP_FAILURE,
      status: AUTH_AUDIT_STATUS.FAILURE,
      email: parsedEmail,
      country: parsedCountry,
      errorCode: isKnown ? error.code : AUTH_ERROR_CODES.SERVER_ERROR,
    });

    if (isKnown) {
      return authErrorResponse(error.message, error.code, error.status);
    }

    console.error("Register profile error", error);
    return authErrorResponse(
      "Something went wrong. Please try again later.",
      AUTH_ERROR_CODES.SERVER_ERROR,
      500,
    );
  }
}

export async function authStatusController(request: Request) {
  let parsedEmail: string | undefined;

  try {
    const firebaseToken = await verifyFirebaseBearerToken(request);
    parsedEmail = firebaseToken.email?.toLowerCase();

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_ATTEMPT,
      status: AUTH_AUDIT_STATUS.SUCCESS,
      email: parsedEmail,
    });

    const data = await resolveAuthStatus(firebaseToken);
    const response = authSuccessResponse("Auth status fetched.", data, 200);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    if (data.sessionToken) {
      response.cookies.set({ ...sessionCookieConfig, value: data.sessionToken });
      await recordAuthAudit({
        eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_SUCCESS,
        status: AUTH_AUDIT_STATUS.SUCCESS,
        email: parsedEmail,
      });
    }

    if (!data.sessionToken) {
      response.cookies.set({ ...sessionCookieConfig, value: "", maxAge: 0 });
    }

    return response;
  } catch (error) {
    const isKnown = isAuthError(error);

    await recordAuthAudit({
      eventType: AUTH_AUDIT_EVENT_TYPE.LOGIN_FAILURE,
      status: AUTH_AUDIT_STATUS.FAILURE,
      email: parsedEmail,
      errorCode: isKnown ? error.code : AUTH_ERROR_CODES.SERVER_ERROR,
    });

    if (isKnown) {
      const response = authErrorResponse(error.message, error.code, error.status);
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }

    console.error("Auth status error", error);
    return authErrorResponse(
      "Something went wrong. Please try again later.",
      AUTH_ERROR_CODES.SERVER_ERROR,
      500,
    );
  }
}

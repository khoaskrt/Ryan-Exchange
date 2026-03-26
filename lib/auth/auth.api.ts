import { AUTH_ERROR_MESSAGES } from "@/lib/auth/auth.constants";
import {
  AuthApiResponse,
  AuthStatusData,
  LoginRequestPayload,
  RegisterProfilePayload,
  SignupRequestPayload,
} from "@/lib/auth/auth.types";

async function parseApiResponse(response: Response): Promise<AuthApiResponse> {
  try {
    return (await response.json()) as AuthApiResponse;
  } catch {
    return {};
  }
}

export async function signup(payload: SignupRequestPayload) {
  const response = await fetch("/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      country: payload.country,
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      referralCode: payload.referralCode,
    }),
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessageByCode: Record<string, string> = {
      AUTH_EMAIL_EXISTS: "Email already existed, please use another email",
      AUTH_WEAK_PASSWORD: data.message ?? AUTH_ERROR_MESSAGES.passwordTooShort,
      AUTH_UNSUPPORTED_COUNTRY: AUTH_ERROR_MESSAGES.countryUnsupported,
      AUTH_INVALID_REQUEST: data.message ?? AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_SERVER_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_VALIDATION_FAILED: data.message ?? AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_COUNTRY_NOT_SUPPORTED: AUTH_ERROR_MESSAGES.countryUnsupported,
      AUTH_INTERNAL_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
    };

    return {
      ok: false,
      message: (data.errorCode && errorMessageByCode[data.errorCode]) || AUTH_ERROR_MESSAGES.genericApiError,
      errorCode: data.errorCode,
    };
  }

  return {
    ok: true,
    message: data.message ?? "Account created successfully.",
  };
}

export async function login(payload: LoginRequestPayload) {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessageByCode: Record<string, string> = {
      AUTH_INVALID_CREDENTIALS: AUTH_ERROR_MESSAGES.loginInvalidCredentials,
      AUTH_INVALID_REQUEST: AUTH_ERROR_MESSAGES.loginInvalidCredentials,
      AUTH_SERVER_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_VALIDATION_FAILED: AUTH_ERROR_MESSAGES.loginInvalidCredentials,
      AUTH_INTERNAL_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
    };

    return {
      ok: false,
      message: (data.errorCode && errorMessageByCode[data.errorCode]) || AUTH_ERROR_MESSAGES.genericApiError,
      errorCode: data.errorCode,
    };
  }

  return {
    ok: true,
    message: data.message ?? "Login successful.",
  };
}

export async function registerProfile(payload: RegisterProfilePayload, idToken: string) {
  const response = await fetch("/api/app-users/register-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessageByCode: Record<string, string> = {
      AUTH_COUNTRY_NOT_SUPPORTED: AUTH_ERROR_MESSAGES.countryUnsupported,
      AUTH_INVALID_REQUEST: data.message ?? AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_UNAUTHORIZED: AUTH_ERROR_MESSAGES.backendAuthConfigError,
      AUTH_SERVER_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
      AUTH_INTERNAL_ERROR: AUTH_ERROR_MESSAGES.genericApiError,
    };

    return {
      ok: false,
      message: (data.errorCode && errorMessageByCode[data.errorCode]) || AUTH_ERROR_MESSAGES.genericApiError,
      errorCode: data.errorCode,
    };
  }

  return {
    ok: true,
    message: data.message ?? "Profile registered successfully.",
  };
}

export async function fetchAuthStatus(idToken: string): Promise<
  | {
      ok: true;
      data: AuthStatusData;
    }
  | { ok: false; message: string; errorCode?: string }
> {
  const response = await fetch("/api/auth/status", {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    return {
      ok: false,
      message: data.message ?? AUTH_ERROR_MESSAGES.genericApiError,
      errorCode: data.errorCode,
    };
  }

  return {
    ok: true,
    data: (data.data ?? null) as AuthStatusData,
  };
}

export async function appLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

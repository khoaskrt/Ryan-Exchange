import { NextResponse } from "next/server";

import { AUTH_LEGACY_ERROR_ALIAS, type AuthErrorCode } from "@/lib/server/auth/auth.errors";

export function authSuccessResponse<T>(message: string, data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status },
  );
}

export function authErrorResponse(message: string, errorCode: AuthErrorCode, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      errorCode,
      legacyErrorCode: AUTH_LEGACY_ERROR_ALIAS[errorCode],
    },
    { status },
  );
}

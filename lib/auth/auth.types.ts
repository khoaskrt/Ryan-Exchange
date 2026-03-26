import { AUTH_ALLOWED_COUNTRY } from "@/lib/auth/auth.constants";

export type CountryCode = typeof AUTH_ALLOWED_COUNTRY;

export type SignupStep1Values = {
  country: string;
};

export type SignupStep2Values = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
};

export type LoginValues = {
  email: string;
  password: string;
};

export type ValidationErrors<T extends Record<string, unknown>> = Partial<Record<keyof T | "form", string>>;

export type AuthApiResponse = {
  message?: string;
  errorCode?: string;
  legacyErrorCode?: string;
  success?: boolean;
  data?: unknown;
};

export type SignupRequestPayload = {
  country: string;
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
};

export type LoginRequestPayload = {
  email: string;
  password: string;
};

export type RegisterProfilePayload = {
  country: string;
  fullName: string;
  referralCode?: string;
};

export type AuthStatusData = {
  isAuthenticated: boolean;
  firebaseUid: string;
  emailVerified: boolean;
  appStatus: "pending_email_verification" | "active" | "restricted" | "suspended" | null;
  access: {
    allowed: boolean;
    reason: string;
  };
};

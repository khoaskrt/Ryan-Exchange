export const AUTH_ROUTES = {
  login: "/login",
  signupStep1: "/signup",
  signupStep2: "/signup/details",
  forgotPassword: "/forgot-password",
  verifyEmail: "/verify-email",
  ssoCallbackBase: "/sso/callback",
} as const;

export const AUTH_ALLOWED_COUNTRY = "Vietnam";

export const AUTH_COUNTRY_OPTIONS = [
  {
    label: "Vietnam",
    value: AUTH_ALLOWED_COUNTRY,
  },
] as const;

export const AUTH_SESSION_KEYS = {
  signupCountry: "auth.signup.country",
} as const;

export const AUTH_ERROR_MESSAGES = {
  countryRequired: "Please select your country or region to continue.",
  countryUnsupported: "Registration is currently available only for Vietnam.",
  fullNameRequired: "Please enter your full name.",
  fullNameTooShort: "Full name must be at least 2 characters.",
  fullNameTooLong: "Full name must be fewer than 100 characters.",
  emailRequired: "Please enter your email address.",
  emailInvalid: "Please enter a valid email address.",
  passwordRequired: "Please enter your password.",
  passwordTooShort: "Password must be at least 8 characters.",
  passwordTooLong: "Password must be fewer than 64 characters.",
  confirmPasswordRequired: "Please confirm your password.",
  confirmPasswordMismatch: "Passwords do not match.",
  referralInvalid: "Referral code format is invalid.",
  genericApiError: "Something went wrong. Please try again later.",
  firebaseAuthDisabled:
    "Email/password authentication is not enabled in Firebase. Please enable it in Firebase Console.",
  firebaseInvalidApiKey: "Firebase API key is invalid. Please check environment configuration.",
  firebaseNetworkError: "Network error. Please check your internet connection and try again.",
  backendAuthConfigError:
    "Server authentication config is not ready. Please restart server after updating Firebase Admin credentials.",
  loginInvalidCredentials: "Invalid email or password.",
  ssoUnavailable: "Coming soon",
  signupSuccess: "Account created successfully. Check your inbox to verify email.",
  verifyEmailRequired: "Please verify your email before accessing the exchange.",
} as const;

export const PASSWORD_POLICY_HINT = "Minimum 8 characters.";

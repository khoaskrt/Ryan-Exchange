import { AUTH_ALLOWED_COUNTRY, AUTH_ERROR_MESSAGES } from "@/lib/auth/auth.constants";
import { LoginValues, SignupStep1Values, SignupStep2Values, ValidationErrors } from "@/lib/auth/auth.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-zÀ-ỹ\s'.-]+$/;
const REFERRAL_REGEX = /^[A-Za-z0-9]+$/;

export function validateSignupStep1(values: SignupStep1Values): ValidationErrors<SignupStep1Values> {
  const errors: ValidationErrors<SignupStep1Values> = {};

  if (!values.country) {
    errors.country = AUTH_ERROR_MESSAGES.countryRequired;
    return errors;
  }

  if (values.country !== AUTH_ALLOWED_COUNTRY) {
    errors.country = AUTH_ERROR_MESSAGES.countryUnsupported;
  }

  return errors;
}

export function validateSignupStep2(values: SignupStep2Values): ValidationErrors<SignupStep2Values> {
  const errors: ValidationErrors<SignupStep2Values> = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const password = values.password;
  const confirmPassword = values.confirmPassword;
  const referralCode = values.referralCode.trim();

  if (!fullName) {
    errors.fullName = AUTH_ERROR_MESSAGES.fullNameRequired;
  } else if (fullName.length < 2) {
    errors.fullName = AUTH_ERROR_MESSAGES.fullNameTooShort;
  } else if (fullName.length > 100) {
    errors.fullName = AUTH_ERROR_MESSAGES.fullNameTooLong;
  } else if (!NAME_REGEX.test(fullName)) {
    errors.fullName = AUTH_ERROR_MESSAGES.fullNameRequired;
  }

  if (!email) {
    errors.email = AUTH_ERROR_MESSAGES.emailRequired;
  } else if (!EMAIL_REGEX.test(email) || email.length > 254) {
    errors.email = AUTH_ERROR_MESSAGES.emailInvalid;
  }

  if (!password) {
    errors.password = AUTH_ERROR_MESSAGES.passwordRequired;
  } else if (password.length < 8) {
    errors.password = AUTH_ERROR_MESSAGES.passwordTooShort;
  } else if (password.length > 64) {
    errors.password = AUTH_ERROR_MESSAGES.passwordTooLong;
  }

  if (!confirmPassword) {
    errors.confirmPassword = AUTH_ERROR_MESSAGES.confirmPasswordRequired;
  } else if (confirmPassword !== password) {
    errors.confirmPassword = AUTH_ERROR_MESSAGES.confirmPasswordMismatch;
  }

  if (referralCode && (referralCode.length > 50 || !REFERRAL_REGEX.test(referralCode))) {
    errors.referralCode = AUTH_ERROR_MESSAGES.referralInvalid;
  }

  return errors;
}

export function validateLogin(values: LoginValues): ValidationErrors<LoginValues> {
  const errors: ValidationErrors<LoginValues> = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = AUTH_ERROR_MESSAGES.emailRequired;
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = AUTH_ERROR_MESSAGES.emailInvalid;
  }

  if (!values.password) {
    errors.password = AUTH_ERROR_MESSAGES.passwordRequired;
  }

  return errors;
}

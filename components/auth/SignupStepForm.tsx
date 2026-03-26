"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { registerProfile } from "@/lib/auth/auth.api";
import { AUTH_ANALYTICS_EVENTS, trackAuthEvent } from "@/lib/auth/analytics";
import { AUTH_ERROR_MESSAGES, AUTH_ROUTES, AUTH_SESSION_KEYS, PASSWORD_POLICY_HINT } from "@/lib/auth/auth.constants";
import { getFirebaseAuthClient } from "@/lib/auth/firebase.client";
import { SignupStep2Values, ValidationErrors } from "@/lib/auth/auth.types";
import { validateSignupStep2 } from "@/lib/auth/validators";

const INITIAL_VALUES: SignupStep2Values = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
};

export function SignupStepForm() {
  const router = useRouter();
  const [values, setValues] = useState<SignupStep2Values>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ValidationErrors<SignupStep2Values>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const country = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(AUTH_SESSION_KEYS.signupCountry) ?? "";
  }, []);

  const canSubmit = useMemo(
    () =>
      values.fullName.trim() !== "" &&
      values.email.trim() !== "" &&
      values.password !== "" &&
      values.confirmPassword !== "" &&
      !isSubmitting &&
      !successMessage,
    [isSubmitting, successMessage, values],
  );

  function updateField<K extends keyof SignupStep2Values>(field: K, value: SignupStep2Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));

    setErrors((current) => {
      if (!current[field] && !current.form) return current;
      return {
        ...current,
        [field]: undefined,
        form: undefined,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || successMessage) return;

    const validationErrors = validateSignupStep2(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    trackAuthEvent(AUTH_ANALYTICS_EVENTS.submitSignup, { country });
    setIsSubmitting(true);

    let response:
      | { ok: true; message: string }
      | { ok: false; message: string; errorCode?: string | undefined };

    try {
      const auth = await getFirebaseAuthClient();
      const credential = await createUserWithEmailAndPassword(
        auth,
        values.email.trim().toLowerCase(),
        values.password,
      );
      await updateProfile(credential.user, { displayName: values.fullName.trim() });

      await sendEmailVerification(credential.user);
      const idToken = await credential.user.getIdToken(true);

      response = await registerProfile(
        {
          country,
          fullName: values.fullName.trim(),
          referralCode: values.referralCode.trim() || undefined,
        },
        idToken,
      );
    } catch (error) {
      const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      const errorMessageByCode: Record<string, string> = {
        "auth/email-already-in-use": "Email already existed, please use another email",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Please use a stronger password.",
        "auth/network-request-failed": AUTH_ERROR_MESSAGES.firebaseNetworkError,
        "auth/operation-not-allowed": AUTH_ERROR_MESSAGES.firebaseAuthDisabled,
        "auth/invalid-api-key": AUTH_ERROR_MESSAGES.firebaseInvalidApiKey,
      };

      response = {
        ok: false,
        message: errorMessageByCode[firebaseCode] ?? AUTH_ERROR_MESSAGES.genericApiError,
      };
    }

    if (!response.ok) {
      setErrors({ form: response.message });
      trackAuthEvent(AUTH_ANALYTICS_EVENTS.signupFailure, { errorCode: response.errorCode ?? "UNKNOWN_ERROR" });
      setIsSubmitting(false);
      return;
    }

    trackAuthEvent(AUTH_ANALYTICS_EVENTS.signupSuccess, { country });
    setSuccessMessage(AUTH_ERROR_MESSAGES.signupSuccess);
    setIsSubmitting(false);
    window.sessionStorage.removeItem(AUTH_SESSION_KEYS.signupCountry);
    window.setTimeout(() => {
      router.push(AUTH_ROUTES.verifyEmail);
      router.refresh();
    }, 1100);
  }

  if (!country) {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <p className="text-sm text-zinc-700">Country selection is missing. Please complete Step 1 first.</p>
        <Link
          href={AUTH_ROUTES.signupStep1}
          className="text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:decoration-black"
        >
          Go to Step 1
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Step 2 of 2</p>
        <p className="mt-1 text-sm text-zinc-700">Create your account for {country}.</p>
      </div>

      <AuthInput
        id="fullName"
        name="fullName"
        label="Full Name"
        placeholder="Nguyen Van A"
        value={values.fullName}
        onChange={(event) => updateField("fullName", event.target.value)}
        error={errors.fullName}
      />

      <AuthInput
        id="email"
        name="email"
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        error={errors.email}
      />

      <PasswordInput
        id="password"
        name="password"
        label="Password"
        placeholder="Enter your password"
        value={values.password}
        onChange={(event) => updateField("password", event.target.value)}
        error={errors.password}
        hint={PASSWORD_POLICY_HINT}
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={values.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
        error={errors.confirmPassword}
      />

      <AuthInput
        id="referralCode"
        name="referralCode"
        label="Referral Code (optional)"
        placeholder="RYAN2026"
        value={values.referralCode}
        onChange={(event) => updateField("referralCode", event.target.value)}
        error={errors.referralCode}
      />

      <p className="min-h-5 text-sm text-rose-500">{errors.form ?? " "}</p>
      <p className="min-h-5 text-sm text-emerald-600">{successMessage ?? " "}</p>

      <AuthButton type="submit" loading={isSubmitting} disabled={!canSubmit}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </AuthButton>

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <Link href={AUTH_ROUTES.signupStep1} className="font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:decoration-black">
          Back to country step
        </Link>
        <Link href={AUTH_ROUTES.login} className="font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:decoration-black">
          Already have an account?
        </Link>
      </div>
    </form>
  );
}

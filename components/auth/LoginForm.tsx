"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SSOButtons } from "@/components/auth/SSOButtons";
import { fetchAuthStatus } from "@/lib/auth/auth.api";
import { AUTH_ANALYTICS_EVENTS, trackAuthEvent } from "@/lib/auth/analytics";
import { AUTH_ERROR_MESSAGES, AUTH_ROUTES } from "@/lib/auth/auth.constants";
import { getFirebaseAuthClient } from "@/lib/auth/firebase.client";
import { LoginValues, ValidationErrors } from "@/lib/auth/auth.types";
import { validateLogin } from "@/lib/auth/validators";

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ValidationErrors<LoginValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const canSubmit = useMemo(
    () => values.email.trim() !== "" && values.password !== "" && !isSubmitting,
    [isSubmitting, values.email, values.password],
  );

  useEffect(() => {
    trackAuthEvent(AUTH_ANALYTICS_EVENTS.openLogin);
  }, []);

  function updateField<K extends keyof LoginValues>(field: K, value: LoginValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateLogin(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    trackAuthEvent(AUTH_ANALYTICS_EVENTS.submitLogin, { rememberMe });
    setIsSubmitting(true);

    let response:
      | {
          ok: true;
          data: {
            access: {
              allowed: boolean;
              reason: string;
            };
          };
        }
      | { ok: false; message: string; errorCode?: string };

    try {
      const auth = await getFirebaseAuthClient();
      const credential = await signInWithEmailAndPassword(
        auth,
        values.email.trim().toLowerCase(),
        values.password,
      );
      const idToken = await credential.user.getIdToken(true);
      response = await fetchAuthStatus(idToken);
    } catch (error) {
      const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      const errorMessageByCode: Record<string, string> = {
        "auth/invalid-credential": AUTH_ERROR_MESSAGES.loginInvalidCredentials,
        "auth/user-not-found": AUTH_ERROR_MESSAGES.loginInvalidCredentials,
        "auth/wrong-password": AUTH_ERROR_MESSAGES.loginInvalidCredentials,
        "auth/user-disabled": "Your account has been disabled.",
        "auth/network-request-failed": AUTH_ERROR_MESSAGES.firebaseNetworkError,
        "auth/operation-not-allowed": AUTH_ERROR_MESSAGES.firebaseAuthDisabled,
        "auth/invalid-api-key": AUTH_ERROR_MESSAGES.firebaseInvalidApiKey,
      };

      response = {
        ok: false,
        message: errorMessageByCode[firebaseCode] ?? AUTH_ERROR_MESSAGES.loginInvalidCredentials,
      };
    }

    if (!response.ok) {
      setErrors({ form: response.message });
      trackAuthEvent(AUTH_ANALYTICS_EVENTS.loginFailure, { errorCode: response.errorCode ?? "UNKNOWN_ERROR" });
      setIsSubmitting(false);
      return;
    }

    trackAuthEvent(AUTH_ANALYTICS_EVENTS.loginSuccess, { rememberMe });
    if (response.data.access.allowed) {
      router.push("/dashboard");
    } else {
      router.push(AUTH_ROUTES.verifyEmail);
    }
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="name@example.com"
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        error={errors.email}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">Password</p>
          <Link href={AUTH_ROUTES.forgotPassword} className="text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-black hover:decoration-black">
            Forgot password
          </Link>
        </div>

        <PasswordInput
          id="password"
          name="password"
          label=""
          placeholder="Enter your password"
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          error={errors.password}
        />
      </div>

      <p className="min-h-5 text-sm text-rose-500">{errors.form ?? " "}</p>

      <label className="flex items-center gap-2 text-sm text-zinc-600">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
        />
        Remember me
      </label>

      <AuthButton type="submit" loading={isSubmitting} disabled={!canSubmit}>
        {isSubmitting ? "Signing in..." : "Continue"}
      </AuthButton>

      <SSOButtons />
    </form>
  );
}

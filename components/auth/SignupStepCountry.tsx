"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthButton } from "@/components/auth/AuthButton";
import { AUTH_COUNTRY_OPTIONS, AUTH_ROUTES, AUTH_SESSION_KEYS } from "@/lib/auth/auth.constants";
import { AUTH_ANALYTICS_EVENTS, trackAuthEvent } from "@/lib/auth/analytics";
import { SignupStep1Values } from "@/lib/auth/auth.types";
import { validateSignupStep1 } from "@/lib/auth/validators";

const INITIAL_VALUES: SignupStep1Values = {
  country: "",
};

export function SignupStepCountry() {
  const router = useRouter();
  const [values, setValues] = useState<SignupStep1Values>(INITIAL_VALUES);
  const [error, setError] = useState<string | null>(null);
  const isReadyToContinue = useMemo(() => values.country.trim().length > 0, [values.country]);

  useEffect(() => {
    trackAuthEvent(AUTH_ANALYTICS_EVENTS.openSignup);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateSignupStep1(values);
    if (validationErrors.country) {
      setError(validationErrors.country);
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(AUTH_SESSION_KEYS.signupCountry, values.country);
    }

    trackAuthEvent(AUTH_ANALYTICS_EVENTS.completeSignupStep1, { country: values.country });
    router.push(AUTH_ROUTES.signupStep2);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Step 1 of 2</p>
        <p className="mt-1 text-sm text-zinc-700">Select your country/region to continue registration.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="country" className="block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Country / Region
        </label>
        <select
          id="country"
          value={values.country}
          onChange={(event) => {
            const country = event.target.value;
            setValues({ country });
            setError(null);
          }}
          className="auth-input h-12"
        >
          <option value="">Select country</option>
          {AUTH_COUNTRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="min-h-5 text-xs text-zinc-500">{error ?? "Only Vietnam is available in v1.0."}</p>
      </div>

      <AuthButton type="submit" disabled={!isReadyToContinue}>
        Continue
      </AuthButton>
    </form>
  );
}

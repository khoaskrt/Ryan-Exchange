"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";

import { appLogout, fetchAuthStatus, registerProfile } from "@/lib/auth/auth.api";
import { getFirebaseAuthClient } from "@/lib/auth/firebase.client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string>("Check your inbox and verify your email.");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function refreshStatus() {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const auth = await getFirebaseAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setStatusMessage("Your session expired. Please log in again.");
        router.push("/login");
        return;
      }

      await currentUser.reload();
      const idToken = await currentUser.getIdToken(true);
      const status = await fetchAuthStatus(idToken);

      if (!status.ok) {
        setStatusMessage(status.message);
        return;
      }

      if (status.data.access.allowed) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (status.data.access.reason === "PROFILE_NOT_FOUND") {
        const fullName = currentUser.displayName?.trim() || currentUser.email?.split("@")[0] || "User";
        const profileResult = await registerProfile(
          {
            country: "Vietnam",
            fullName,
          },
          idToken,
        );

        if (!profileResult.ok) {
          setStatusMessage(profileResult.message);
          return;
        }

        const statusAfterProfile = await fetchAuthStatus(idToken);
        if (statusAfterProfile.ok && statusAfterProfile.data.access.allowed) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }

      // Firebase can update emailVerified slightly before backend receives fresh token claims.
      if (currentUser.emailVerified) {
        const retryToken = await currentUser.getIdToken(true);
        const retryStatus = await fetchAuthStatus(retryToken);
        if (retryStatus.ok && retryStatus.data.access.allowed) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }

      setStatusMessage("Email verification is still pending.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function resendVerification() {
    if (isResending) return;
    setIsResending(true);

    try {
      const auth = await getFirebaseAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setStatusMessage("Please log in again to resend verification.");
        return;
      }

      await sendEmailVerification(currentUser);
      setStatusMessage("Verification email has been resent.");
    } catch {
      setStatusMessage("Unable to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogout() {
    const auth = await getFirebaseAuthClient();
    await signOut(auth);
    await appLogout();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="app-shell grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface-elevated)] p-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Verify Email</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Your account has been created. Verify your email before accessing the exchange.
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">{statusMessage}</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing..." : "I've verified, continue"}
          </button>
          <button
            type="button"
            onClick={resendVerification}
            disabled={isResending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--text-muted)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

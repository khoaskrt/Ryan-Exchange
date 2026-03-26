"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";

import { appLogout } from "@/lib/auth/auth.api";
import { getFirebaseAuthClient } from "@/lib/auth/firebase.client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      const auth = await getFirebaseAuthClient();
      await signOut(auth);
      await appLogout();
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className="rounded-md border border-white/10 px-3 py-2 text-[var(--text-muted)] transition hover:text-white disabled:opacity-70"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}

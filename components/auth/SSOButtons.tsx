"use client";

import { useState } from "react";

import { AUTH_ANALYTICS_EVENTS, trackAuthEvent } from "@/lib/auth/analytics";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/auth.constants";

const PROVIDERS = ["Google", "Apple", "QR", "Web3"];

export function SSOButtons() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Or continue with</p>
      <div className="grid grid-cols-4 gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider}
            type="button"
            aria-disabled
            onClick={() => {
              setMessage(AUTH_ERROR_MESSAGES.ssoUnavailable);
              trackAuthEvent(AUTH_ANALYTICS_EVENTS.clickUnavailableSso, { provider });
            }}
            className="h-10 rounded-md border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            {provider}
          </button>
        ))}
      </div>
      <p className="min-h-5 text-center text-xs text-zinc-500">{message ?? " "}</p>
    </div>
  );
}

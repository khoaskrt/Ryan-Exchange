"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
};

export function PasswordInput({ id, label, error, hint, className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={["auth-input h-12 pr-16", error ? "border-rose-400 focus:border-rose-500" : "", className].filter(Boolean).join(" ")}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-600 transition hover:text-black"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <p className="min-h-5 text-xs text-zinc-500">{error ?? hint ?? " "}</p>
    </div>
  );
}

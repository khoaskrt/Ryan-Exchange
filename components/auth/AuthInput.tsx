import type { InputHTMLAttributes } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function AuthInput({ id, label, error, hint, className = "", ...props }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
        {label}
      </label>
      <input id={id} className={["auth-input h-12", error ? "border-rose-400 focus:border-rose-500" : "", className].filter(Boolean).join(" ")} {...props} />
      <p className="min-h-5 text-xs text-zinc-500">{error ?? hint ?? " "}</p>
    </div>
  );
}

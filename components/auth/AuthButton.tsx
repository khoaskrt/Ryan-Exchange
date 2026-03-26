import type { ButtonHTMLAttributes, ReactNode } from "react";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
};

export function AuthButton({ children, loading = false, fullWidth = true, variant = "primary", className = "", disabled, ...props }: AuthButtonProps) {
  const baseClasses =
    "inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const variantClasses =
    variant === "primary"
      ? "bg-black text-white hover:bg-zinc-800"
      : "border border-zinc-300 bg-white text-zinc-700 hover:border-black hover:text-black";

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={[baseClasses, variantClasses, widthClass, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

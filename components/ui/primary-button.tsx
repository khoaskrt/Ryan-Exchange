import type { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconRight?: React.ReactNode;
};

export function PrimaryButton({
  children,
  iconRight,
  className,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={[
        "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] px-4 py-3 text-sm font-semibold text-[var(--brand-ink)]",
        "shadow-[0_10px_30px_rgb(36_231_145/20%)] transition-all duration-200 hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      {iconRight}
    </button>
  );
}

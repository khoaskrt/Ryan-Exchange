import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: React.ReactNode;
};

export function TextField({
  label,
  icon,
  trailing,
  hint,
  className,
  ...props
}: TextFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-sm font-medium text-[var(--text)]">
        {label}
        {hint}
      </span>
      <span className="relative flex items-center">
        {icon ? (
          <span className="pointer-events-none absolute left-3 text-[var(--text-muted)]">
            {icon}
          </span>
        ) : null}
        <input
          className={[
            "h-11 w-full rounded-lg border border-transparent bg-[var(--surface-input)] px-3 text-sm text-[var(--text)]",
            icon ? "pl-10" : "",
            trailing ? "pr-10" : "",
            "outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--surface-border)]",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {trailing ? (
          <span className="absolute right-3 text-[var(--text-muted)]">{trailing}</span>
        ) : null}
      </span>
    </label>
  );
}

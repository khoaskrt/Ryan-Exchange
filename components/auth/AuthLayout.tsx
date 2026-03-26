import type { ReactNode } from "react";

import { AuthHero } from "@/components/auth/AuthHero";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="app-shell flex min-h-screen">
      <AuthHero />
      <section className="flex min-h-screen w-full justify-center bg-white px-4 py-8 sm:px-8 lg:w-[52%] lg:items-center lg:px-14">
        <div className="w-full max-w-md">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 lg:hidden">Ryan Exchange</p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
            <p className="text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          </header>

          <div className="mt-8 space-y-6">{children}</div>

          <footer className="mt-8 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
            {footer ?? (
              <p>
                By continuing, you agree to Ryan Exchange Terms of Service and Privacy Policy.
              </p>
            )}
          </footer>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
            <span>English</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>Support</span>
          </div>
        </div>
      </section>
    </main>
  );
}

import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="app-shell flex min-h-screen">
      <section className="relative hidden w-1/2 overflow-hidden border-r border-white/10 bg-[var(--surface)] p-12 lg:flex lg:flex-col lg:justify-between">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAISazU8xWvSH57nfjOsMBjZchjCkgO1aXwByqBNw4VNx8ybkVOBPprRvN2I1VMh4CSZKo-0FshrofVOOtIfGJGI1f8K8EADCWlIvUEebWhatCFif4M_N_X_twR0tlZn-8G90rBdrv0gUM9aN8EwsgxLcyvc6rAHzoGXnCoE1FTiywOQI7YhYo0wZ8b4U8Sdf6mFVgB59-SxH0NL65LhvAG7Kv3MV_jptaVgOyL7HCCKGw4bXsBfXsB_h0o1LzqoZe1Xt16FvMySxQ2"
          alt="Ryan Exchange"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <div className="relative z-10">
          <p className="text-3xl font-black tracking-tight text-white">Ryan Exchange</p>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-5xl font-black leading-[1.08] tracking-tight text-white">
            Next-gen crypto
            <br />
            <span className="text-[var(--brand)]">trading platform.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--text-muted)]">
            Join millions of traders worldwide. Experience high-frequency precision and institutional-grade security.
          </p>
        </div>
        <div className="relative z-10 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Trusted by 20M+ users
        </div>
      </section>

      <section className="flex w-full items-center justify-center bg-white px-5 py-10 sm:px-8 lg:w-1/2 lg:px-14">
        <div className="w-full max-w-md">
          <header className="mb-8 space-y-2">
            <p className="text-2xl font-black tracking-tight text-black lg:hidden">Ryan Exchange</p>
            <h1 className="text-4xl font-black tracking-tight text-black">{title}</h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </header>
          <div className="space-y-6">{children}</div>
          <footer className="mt-8 border-t border-zinc-100 pt-6 text-sm text-zinc-500">{footer}</footer>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-zinc-400">
            <span>Tiếng Việt</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>Trợ giúp</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export function AuthHero() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-[var(--surface)] p-12 lg:flex lg:w-[48%] lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,131,66,0.28),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.09),transparent_32%),linear-gradient(155deg,#131313_0%,#090909_70%)]" />
      <div className="pointer-events-none absolute -left-10 top-20 h-36 w-36 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute bottom-24 right-12 h-52 w-52 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Ryan Exchange</p>
        <h2 className="mt-6 text-5xl font-black leading-[1.06] tracking-tight text-white">
          Built for serious
          <br />
          <span className="text-[var(--brand)]">crypto execution.</span>
        </h2>
      </div>

      <div className="relative z-10 max-w-lg space-y-4">
        <p className="text-base leading-relaxed text-[var(--text-muted)]">
          Security-first onboarding with clear steps, transparent validation, and a scalable foundation for global expansion.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
          <span className="rounded-md border border-white/10 px-3 py-2">Vietnam v1.0</span>
          <span className="rounded-md border border-white/10 px-3 py-2">SSO Coming Soon</span>
        </div>
      </div>
    </section>
  );
}

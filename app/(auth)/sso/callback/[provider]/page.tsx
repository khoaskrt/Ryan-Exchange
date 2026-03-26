type SsoCallbackPageProps = {
  params: { provider: string };
};

export default function SsoCallbackPage({ params }: SsoCallbackPageProps) {
  const { provider } = params;

  return (
    <main className="app-shell grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface-elevated)] p-6 text-center">
        <h1 className="text-2xl font-semibold text-white">SSO Callback</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Callback route for provider <span className="font-semibold text-white">{provider}</span> is reserved for future SSO enablement.
        </p>
      </div>
    </main>
  );
}

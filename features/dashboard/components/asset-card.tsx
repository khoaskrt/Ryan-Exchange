import type { Asset } from "@/lib/types/market";

type AssetCardProps = {
  asset: Asset;
};

export function AssetCard({ asset }: AssetCardProps) {
  const positive = asset.change24h >= 0;

  return (
    <article className="glass-card rounded-xl p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{asset.symbol}</p>
          <h3 className="mt-1 text-lg font-semibold">{asset.name}</h3>
        </div>
        <span
          className={[
            "rounded-full px-2 py-1 text-xs font-medium",
            positive ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300",
          ].join(" ")}
        >
          {positive ? "+" : ""}
          {asset.change24h.toFixed(2)}%
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold">{asset.balance}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{asset.usdValue}</p>
    </article>
  );
}

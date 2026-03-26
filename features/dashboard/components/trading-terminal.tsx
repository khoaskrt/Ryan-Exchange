"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Market = {
  symbol: string;
  lastPrice: number;
  change24h: number;
  volume24h: number;
};

type Balance = {
  asset: string;
  available: number;
  locked: number;
  total: number;
};

type LedgerEntry = {
  id: string;
  asset: string;
  amount: number;
  entryType: string;
  note: string | null;
  createdAt: string;
};

type Order = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  price: number | null;
  quantity: number;
  filledQty: number;
  avgFillPrice: number | null;
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED";
  createdAt: string;
};

type ActivationSummary = {
  totalUsers: number;
  activatedUsers: number;
  activatedWithin24h: number;
  activationRate: number;
};

const SIDE_CLASSES: Record<Order["side"], string> = {
  BUY: "text-emerald-300",
  SELL: "text-rose-300",
};

const STATUS_CLASSES: Record<Order["status"], string> = {
  NEW: "bg-amber-500/10 text-amber-300",
  PARTIALLY_FILLED: "bg-sky-500/10 text-sky-300",
  FILLED: "bg-emerald-500/10 text-emerald-300",
  CANCELED: "bg-zinc-500/20 text-zinc-300",
  REJECTED: "bg-rose-500/10 text-rose-300",
};

function formatNumber(value: number, digits = 4) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type TradingTerminalProps = {
  userName: string;
};

export function TradingTerminal({ userName }: TradingTerminalProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [activation, setActivation] = useState<ActivationSummary | null>(null);

  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState<Order["side"]>("BUY");
  const [orderType, setOrderType] = useState<Order["orderType"]>("MARKET");
  const [quantity, setQuantity] = useState("0.1");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedMarket = useMemo(() => markets.find((item) => item.symbol === symbol) ?? null, [markets, symbol]);

  const loadData = useCallback(async () => {
    const [marketsRes, balancesRes, ordersRes, ledgerRes, activationRes] = await Promise.all([
      fetch("/api/markets"),
      fetch("/api/wallet/balances"),
      fetch("/api/orders"),
      fetch("/api/wallet/ledger"),
      fetch("/api/analytics/activation"),
    ]);

    if (!marketsRes.ok || !balancesRes.ok || !ordersRes.ok || !ledgerRes.ok || !activationRes.ok) {
      throw new Error("Unable to refresh dashboard data.");
    }

    const marketsJson = (await marketsRes.json()) as { markets: Market[] };
    const balancesJson = (await balancesRes.json()) as { balances: Balance[] };
    const ordersJson = (await ordersRes.json()) as { orders: Order[] };
    const ledgerJson = (await ledgerRes.json()) as { entries: LedgerEntry[] };
    const activationJson = (await activationRes.json()) as { summary: ActivationSummary };

    setMarkets(marketsJson.markets);
    setBalances(balancesJson.balances);
    setOrders(ordersJson.orders);
    setLedger(ledgerJson.entries);
    setActivation(activationJson.summary);
  }, []);

  useEffect(() => {
    loadData().catch(() => setError("Unable to load terminal data."));
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          orderType,
          quantity: Number(quantity),
          price: orderType === "LIMIT" ? Number(price) : undefined,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(result.message ?? "Unable to place order.");
        return;
      }

      setMessage("Order submitted successfully.");
      await loadData();
    } catch {
      setError("Network error while placing order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(result.message ?? "Unable to cancel order.");
        return;
      }

      setMessage("Order canceled.");
      await loadData();
    } catch {
      setError("Network error while canceling order.");
    }
  }

  const topBalances = balances.slice(0, 6);
  const recentLedger = ledger.slice(0, 8);
  const recentOrders = orders.slice(0, 12);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[var(--surface)] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-24 items-center justify-center overflow-hidden rounded-md bg-[#e6e6e8] px-1">
              <Image src="/brand/rxi-light-cropped.png" alt="Ryan Exchange Logo" width={980} height={300} className="h-full w-full object-contain" />
            </span>
            <p className="text-sm font-black tracking-tight text-white sm:text-base">Ryan Exchange: Trust First. Trade Next.</p>
          </div>
          <nav className="hidden items-center gap-5 text-sm text-[var(--text-muted)] md:flex">
            <span className="border-b-2 border-[var(--brand)] pb-1 font-semibold text-white">Markets</span>
            <span>Trade</span>
            <span>Earn</span>
            <span>Web3</span>
          </nav>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <button className="rounded bg-[#262626] px-4 py-1.5 text-sm font-semibold text-white">Log In</button>
          <button className="rounded bg-white px-4 py-1.5 text-sm font-semibold text-black">Sign Up</button>
        </div>
      </header>

      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-64px)] w-64 flex-col border-r border-white/5 bg-[var(--surface)] md:flex">
        <div className="p-6">
          <p className="text-lg font-black tracking-tight text-white">Ryan Exchange</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Verified Pro</p>
          <nav className="mt-8 space-y-1 text-sm">
            <a className="flex items-center gap-3 border-l-4 border-[var(--brand)] bg-[#262626] px-4 py-3 font-semibold text-white" href="#">
              Home
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[#131313] hover:text-white" href="#">
              Markets
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[#131313] hover:text-white" href="#">
              Trade
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[#131313] hover:text-white" href="#">
              Assets
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[#131313] hover:text-white" href="#">
              History
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[#131313] hover:text-white" href="#">
              Settings
            </a>
          </nav>
          <button className="mt-8 w-full rounded bg-[var(--brand)] py-3 text-xs font-black uppercase tracking-[0.13em] text-black">
            Deposit Now
          </button>
        </div>
        <div className="mt-auto border-t border-white/5 p-6 text-xs uppercase tracking-[0.13em] text-[var(--text-muted)]">
          <p>Support</p>
          <p className="mt-3">API</p>
        </div>
      </aside>

      <main className="app-shell px-4 pb-8 pt-24 sm:px-6 lg:px-10 md:ml-64">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {markets.slice(0, 4).map((market) => (
              <article key={market.symbol} className="glass-card rounded-xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{market.symbol}</p>
                <p className="mt-2 text-2xl font-black text-white">${formatCurrency(market.lastPrice)}</p>
                <p className={["mt-1 text-sm font-semibold", market.change24h >= 0 ? "text-[var(--brand)]" : "text-[var(--danger)]"].join(" ")}>
                  {market.change24h >= 0 ? "+" : ""}
                  {market.change24h.toFixed(2)}%
                </p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="panel-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight text-white">Crypto nổi bật</h2>
                <button className="text-xs font-bold text-[var(--brand)]">Tất cả</button>
              </div>
              <div className="space-y-3">
                {markets.slice(0, 3).map((market) => (
                  <div key={market.symbol} className="flex items-center justify-between rounded-lg p-3 transition hover:bg-[var(--surface-3)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-black text-white">
                        {market.symbol.split("/")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{market.symbol.split("/")[0]}</p>
                        <p className="text-[10px] uppercase tracking-[0.13em] text-[var(--text-muted)]">{market.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">${formatCurrency(market.lastPrice)}</p>
                      <p className={market.change24h >= 0 ? "text-xs font-bold text-[var(--brand)]" : "text-xs font-bold text-[var(--danger)]"}>
                        {market.change24h >= 0 ? "+" : ""}
                        {market.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel-card p-6">
              <h2 className="text-2xl font-black tracking-tight text-white">Activation Snapshot</h2>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center justify-between rounded-lg bg-[var(--surface-3)] px-3 py-2">
                  <span className="text-[var(--text-muted)]">Total Users</span>
                  <span className="font-semibold text-white">{activation?.totalUsers ?? 0}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-[var(--surface-3)] px-3 py-2">
                  <span className="text-[var(--text-muted)]">Activated Users</span>
                  <span className="font-semibold text-white">{activation?.activatedUsers ?? 0}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-[var(--surface-3)] px-3 py-2">
                  <span className="text-[var(--text-muted)]">Activated in 24h</span>
                  <span className="font-semibold text-white">{activation?.activatedWithin24h ?? 0}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-[var(--surface-3)] px-3 py-2">
                  <span className="text-[var(--text-muted)]">Activation Rate</span>
                  <span className="font-semibold text-[var(--brand)]">{activation?.activationRate ?? 0}%</span>
                </li>
              </ul>
            </aside>
          </section>

          <section className="panel-card p-6">
            <h2 className="text-xl font-black tracking-tight text-white">Place Order</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--text-muted)]">Market</span>
                <select
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[var(--surface-3)] px-3 text-white"
                >
                  {markets.map((market) => (
                    <option key={market.symbol} value={market.symbol}>
                      {market.symbol}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--text-muted)]">Side</span>
                <select
                  value={side}
                  onChange={(event) => setSide(event.target.value as Order["side"])}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[var(--surface-3)] px-3 text-white"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--text-muted)]">Order Type</span>
                <select
                  value={orderType}
                  onChange={(event) => setOrderType(event.target.value as Order["orderType"])}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[var(--surface-3)] px-3 text-white"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--text-muted)]">Quantity</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[var(--surface-3)] px-3 text-white"
                  required
                />
              </label>
              {orderType === "LIMIT" ? (
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[var(--text-muted)]">Limit Price</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-[var(--surface-3)] px-3 text-white"
                    required
                  />
                </label>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="sm:col-span-2 rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-[var(--brand-strong)] disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit Order"}
              </button>
            </form>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Mark price: {selectedMarket ? `$${formatCurrency(selectedMarket.lastPrice)}` : "-"}
            </p>
            {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="panel-card p-6">
              <h2 className="text-xl font-black tracking-tight text-white">Wallet Balances</h2>
              <div className="mt-4 space-y-2 text-sm">
                {topBalances.map((balance) => (
                  <div key={balance.asset} className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-medium text-white">{balance.asset}</span>
                    <span className="text-[var(--text-muted)]">
                      avail {formatNumber(balance.available)} | locked {formatNumber(balance.locked)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-card p-6">
              <h2 className="text-xl font-black tracking-tight text-white">Wallet Ledger</h2>
              <div className="mt-4 space-y-2 text-xs">
                {recentLedger.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-medium text-white">{entry.asset}</span>
                    <span className={entry.amount >= 0 ? "text-[var(--brand)]" : "text-[var(--danger)]"}>
                      {entry.amount >= 0 ? "+" : ""}
                      {formatNumber(entry.amount)}
                    </span>
                    <span className="text-[var(--text-muted)]">{entry.entryType}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-card overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-xl font-black tracking-tight text-white">Order History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Pair</th>
                    <th className="px-6 py-4 font-semibold">Side</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Qty</th>
                    <th className="px-6 py-4 font-semibold">Filled</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-white/8 hover:bg-[var(--surface-3)]">
                      <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{order.id.slice(0, 10)}</td>
                      <td className="px-6 py-4 text-white">{order.symbol}</td>
                      <td className={["px-6 py-4 font-semibold", SIDE_CLASSES[order.side]].join(" ")}>{order.side}</td>
                      <td className="px-6 py-4">{order.orderType}</td>
                      <td className="px-6 py-4">{formatNumber(order.quantity)}</td>
                      <td className="px-6 py-4">{formatNumber(order.filledQty)}</td>
                      <td className="px-6 py-4">
                        <span className={["rounded-full px-2 py-1 text-xs font-medium", STATUS_CLASSES[order.status]].join(" ")}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.status === "NEW" || order.status === "PARTIALLY_FILLED" ? (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:text-white"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

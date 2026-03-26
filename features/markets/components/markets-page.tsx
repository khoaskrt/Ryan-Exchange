"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MarketCategory = "ALL" | "FAVORITE" | "LAYER2" | "MEME" | "DEFI";

type TokenRow = {
  symbol: string;
  name: string;
  pair: string;
  price: number;
  change24h: number;
  marketCap: string;
  volume24h: string;
  category: Exclude<MarketCategory, "ALL" | "FAVORITE">;
  isFavorite?: boolean;
};

const navItems = ["Markets", "Trade", "Earn", "Web3"];

const tokenRows: TokenRow[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    pair: "BTC/USDT",
    price: 64231.5,
    change24h: 2.45,
    marketCap: "$1.26T",
    volume24h: "$32.5B",
    category: "LAYER2",
    isFavorite: true,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    pair: "ETH/USDT",
    price: 3452.12,
    change24h: 1.89,
    marketCap: "$414.8B",
    volume24h: "$15.2B",
    category: "DEFI",
    isFavorite: true,
  },
  {
    symbol: "SOL",
    name: "Solana",
    pair: "SOL/USDT",
    price: 145.67,
    change24h: -0.56,
    marketCap: "$64.7B",
    volume24h: "$4.1B",
    category: "LAYER2",
  },
  {
    symbol: "BNB",
    name: "BNB",
    pair: "BNB/USDT",
    price: 589.42,
    change24h: 0.12,
    marketCap: "$88.4B",
    volume24h: "$1.8B",
    category: "DEFI",
  },
  {
    symbol: "XRP",
    name: "Ripple",
    pair: "XRP/USDT",
    price: 0.6124,
    change24h: -1.24,
    marketCap: "$33.6B",
    volume24h: "$945M",
    category: "LAYER2",
  },
  {
    symbol: "PEPE",
    name: "Pepe",
    pair: "PEPE/USDT",
    price: 0.00000842,
    change24h: 12.4,
    marketCap: "$3.4B",
    volume24h: "$1.1B",
    category: "MEME",
  },
  {
    symbol: "WIF",
    name: "Dogwifhat",
    pair: "WIF/USDT",
    price: 3.12,
    change24h: 8.2,
    marketCap: "$3.1B",
    volume24h: "$741M",
    category: "MEME",
    isFavorite: true,
  },
  {
    symbol: "ONDO",
    name: "Ondo",
    pair: "ONDO/USDT",
    price: 0.78,
    change24h: 4.5,
    marketCap: "$1.1B",
    volume24h: "$112M",
    category: "DEFI",
  },
  {
    symbol: "OP",
    name: "Optimism",
    pair: "OP/USDT",
    price: 3.41,
    change24h: -1.8,
    marketCap: "$4.2B",
    volume24h: "$540M",
    category: "LAYER2",
  },
];

const tabs: { key: MarketCategory; label: string }[] = [
  { key: "ALL", label: "Tất cả Token" },
  { key: "FAVORITE", label: "Yêu thích" },
  { key: "LAYER2", label: "Layer 2" },
  { key: "MEME", label: "Meme" },
  { key: "DEFI", label: "DeFi" },
];

type MarketsPageProps = {
  user: {
    email: string;
    uid: string;
  } | null;
};

function formatPrice(value: number) {
  if (value < 0.01) return value.toFixed(8);
  if (value < 1) return value.toFixed(4);
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVnd(value: number) {
  const vnd = value * 25500;
  return vnd.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

export function MarketsPage({ user }: MarketsPageProps) {
  const [activeTab, setActiveTab] = useState<MarketCategory>("ALL");
  const [query, setQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const featured = tokenRows.slice(0, 3);
  const newListings = tokenRows.filter((row) => ["PEPE", "WIF", "ONDO", "OP"].includes(row.symbol)).slice(0, 4);

  const keyword = query.trim().toLowerCase();
  const filteredRows = tokenRows.filter((row) => {
    const passTab =
      activeTab === "ALL" ? true : activeTab === "FAVORITE" ? Boolean(row.isFavorite) : row.category === activeTab;

    const passKeyword =
      keyword.length === 0 ||
      row.symbol.toLowerCase().includes(keyword) ||
      row.name.toLowerCase().includes(keyword) ||
      row.pair.toLowerCase().includes(keyword);

    return passTab && passKeyword;
  });

  useEffect(() => {
    if (!isUserMenuOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  return (
    <div className="min-h-screen bg-[#060708] text-zinc-100">
      <div className="mx-auto max-w-[1600px]">
        <header className="sticky top-0 z-40 border-b border-zinc-900/70 bg-[#090a0c]/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Image
                src="/brand/ryan-exchange-wordmark-cropped.png"
                alt="Ryan Exchange"
                width={164}
                height={32}
                className="h-7 w-auto object-contain"
              />
              <nav className="hidden items-center gap-6 md:flex">
                {navItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={[
                      "text-sm font-medium transition",
                      item === "Markets" ? "border-b-2 border-orange-500 pb-1 text-white" : "text-zinc-400 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300"
              >
                Dashboard
              </Link>
              {user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left"
                  >
                    <span className="h-8 w-8 overflow-hidden rounded-full border border-zinc-700">
                      <Image src="/brand/rxi-mark.png" alt="User avatar" width={32} height={32} className="h-full w-full object-cover" />
                    </span>
                    <span className="hidden min-w-0 md:block">
                      <span className="block max-w-[180px] truncate text-sm font-semibold text-zinc-200">{user.email}</span>
                      <span className="block text-xs text-zinc-500">UID: {user.uid}</span>
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-xl border border-zinc-700 bg-zinc-800 p-4 shadow-2xl">
                      <div className="flex items-center gap-3">
                        <span className="h-11 w-11 overflow-hidden rounded-full border border-zinc-600">
                          <Image src="/brand/rxi-mark.png" alt="User avatar" width={44} height={44} className="h-full w-full object-cover" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-zinc-100">{user.email}</p>
                          <p className="mt-0.5 text-sm text-zinc-400">UID: {user.uid}</p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-zinc-700 pt-3">
                        <p className="text-sm text-zinc-400">Recently Used</p>
                        <p className="mt-1 text-xl font-semibold text-zinc-100">QL1Investing</p>
                        <button type="button" className="mt-3 text-lg font-semibold text-orange-400 hover:text-orange-300">
                          Switch/Create Account
                        </button>
                      </div>

                      <div className="mt-4 border-t border-zinc-700 pt-3">
                        <nav className="space-y-1">
                          {[
                            "Overview",
                            "Account",
                            "My Events",
                            "Referral Program",
                            "Preference Settings",
                            "Subaccount",
                            "API",
                            "My Fee Rates",
                            "Audit",
                            "Demo Trading",
                          ].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="block w-full rounded-md px-2 py-2 text-left text-lg font-semibold text-zinc-100 hover:bg-zinc-700/60"
                            >
                              {item}
                            </button>
                          ))}
                        </nav>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button type="button" className="hidden rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 md:inline-flex">
                    Log In
                  </button>
                  <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-r border-zinc-900 bg-[#07080a] px-5 py-6 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)]">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="h-11 w-11 overflow-hidden rounded-full border border-zinc-700">
                <Image src="/brand/rxi-mark.png" alt="Profile" width={44} height={44} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Ryan Exchange</p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-400">Verified Pro</p>
              </div>
            </div>

            <nav className="mt-6 space-y-1 text-sm">
              {[
                "Home",
                "Markets",
                "Trade",
                "Assets",
                "History",
                "Settings",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={[
                    "flex w-full items-center rounded-lg px-3 py-3 text-left font-semibold transition",
                    item === "Home"
                      ? "border-l-4 border-orange-500 bg-zinc-900 text-white"
                      : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </nav>

            <button type="button" className="mt-6 w-full rounded-lg bg-orange-500 py-3 text-sm font-black uppercase tracking-[0.08em] text-black">
              Deposit Now
            </button>

            <div className="mt-8 border-t border-zinc-900 pt-4 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <p className="py-2">Support</p>
              <p className="py-2">API</p>
            </div>
          </aside>

          <main className="space-y-6 px-4 py-5 md:px-6 lg:px-8 lg:py-6">
            <section className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[2rem] font-black tracking-tight text-white">Crypto nổi bật</h2>
                  <button type="button" className="text-sm font-bold text-orange-400">
                    Tất cả
                  </button>
                </div>
                <div className="space-y-4">
                  {featured.map((item) => (
                    <div key={item.symbol} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-zinc-900/80">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-sm font-black text-zinc-200">
                          {item.symbol}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{item.name}</p>
                          <p className="text-sm text-zinc-500">{item.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-zinc-100">{formatPrice(item.price)}</p>
                        <p className={`text-base font-semibold ${item.change24h >= 0 ? "text-orange-400" : "text-rose-400"}`}>
                          {item.change24h >= 0 ? "+" : ""}
                          {item.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[2rem] font-black tracking-tight text-white">Tài sản mới niêm yết</h2>
                  <button type="button" className="text-sm font-bold text-orange-400">
                    Mới nhất
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {newListings.map((item) => (
                    <div key={item.symbol} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
                      <p className="text-sm font-bold text-zinc-300">{item.pair}</p>
                      <p className="mt-2 text-4xl font-black text-zinc-100">{formatPrice(item.price)}</p>
                      <p className={`mt-1 text-lg font-semibold ${item.change24h >= 0 ? "text-orange-400" : "text-rose-400"}`}>
                        {item.change24h >= 0 ? "+" : ""}
                        {item.change24h.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-[#0b0c10]">
              <div className="flex flex-col gap-4 border-b border-zinc-800 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex flex-wrap items-center gap-5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={[
                        "pb-2 text-lg font-semibold transition",
                        activeTab === tab.key ? "border-b-2 border-orange-500 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
                      ].join(" ")}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="w-full md:w-[320px]">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm kiếm coin..."
                    className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                      <th className="px-6 py-4">Token</th>
                      <th className="px-6 py-4">Giá</th>
                      <th className="px-6 py-4">Thay đổi (24h)</th>
                      <th className="px-6 py-4">Vốn hóa thị trường</th>
                      <th className="px-6 py-4">Khối lượng (24h)</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.symbol} className="border-b border-zinc-900/90">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-zinc-200">
                              {row.symbol}
                            </div>
                            <div>
                              <p className="text-base font-bold text-zinc-100">{row.name}</p>
                              <p className="text-xs text-zinc-500">{row.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-[1.6rem] font-black text-zinc-100">${formatPrice(row.price)}</p>
                          <p className="text-xs text-zinc-500">≈ {formatVnd(row.price)} VND</p>
                        </td>
                        <td className={`px-6 py-5 text-[1.6rem] font-bold ${row.change24h >= 0 ? "text-orange-400" : "text-rose-400"}`}>
                          {row.change24h >= 0 ? "+" : ""}
                          {row.change24h.toFixed(2)}%
                        </td>
                        <td className="px-6 py-5 text-2xl font-medium text-zinc-300">{row.marketCap}</td>
                        <td className="px-6 py-5 text-2xl font-medium text-zinc-300">{row.volume24h}</td>
                        <td className="px-6 py-5 text-right">
                          <button type="button" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-black hover:bg-white">
                            Giao dịch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-5 text-center">
                <button type="button" className="text-xl font-semibold text-zinc-300 hover:text-white">
                  Xem thêm tất cả các thị trường →
                </button>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
              <article className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6">
                <p className="max-w-2xl text-5xl font-black uppercase leading-tight text-zinc-100">
                  Giao dịch mọi lúc, mọi nơi với Ryan App
                </p>
                <p className="mt-4 max-w-2xl text-lg text-zinc-400">
                  Trải nghiệm giao dịch tiền mã hóa mượt mà nhất trên thiết bị di động của bạn.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm font-semibold text-zinc-100">
                    Download on App Store
                  </button>
                  <button type="button" className="rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm font-semibold text-zinc-100">
                    Get it on Google Play
                  </button>
                </div>
              </article>

              <article className="rounded-2xl bg-orange-500 p-6 text-black">
                <p className="text-5xl font-black leading-tight">Kiếm tới 10% APR</p>
                <p className="mt-4 text-xl font-medium">
                  Đăng ký tham gia Ryan Earn ngay hôm nay và bắt đầu tích lũy tài sản thụ động.
                </p>
                <button type="button" className="mt-8 w-full rounded-lg bg-black py-3 text-base font-black uppercase tracking-[0.08em] text-white">
                  Bắt đầu ngay
                </button>
              </article>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWalletRealtime } from "@/features/wallet/hooks/use-wallet-realtime";
import { type WalletDepositSocketEvent } from "@/lib/socket/events";

type ViewKey = "overview" | "deposit" | "withdraw" | "history";
type TransactionType = "DEPOSIT" | "WITHDRAW";
type TransactionStatus = "PENDING" | "REVIEW" | "PROCESSING" | "COMPLETED" | "FAILED";
type ApiTransactionStatus = TransactionStatus | "CONFIRMED" | "CANCELED";

type AssetRow = {
  id: string;
  assetCode: string;
  assetName: string;
  networkCode: string;
  available: number;
  locked: number;
  priceUsd: number;
};

type TransactionRow = {
  txId: string;
  type: TransactionType;
  status: TransactionStatus;
  assetCode: string;
  networkCode: string;
  amount: number;
  fee: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  createdAt: string;
};

type WithdrawFlowState = "IDLE" | "REVIEW" | "PROCESSING" | "COMPLETED" | "FAILED";
type DepositFlowState = "IDLE" | "PENDING" | "COMPLETED" | "FAILED";

type OverviewResponse = {
  summary?: {
    assetCode: string;
    total: number;
    available: number;
    locked: number;
  };
  assets?: Array<{
    assetCode: string;
    total: number;
    available: number;
    locked: number;
  }>;
};

type TransactionsResponse = {
  transactions?: Array<{
    txId: string;
    type: TransactionType;
    status: ApiTransactionStatus;
    assetCode: string;
    networkCode: string;
    amount: number;
    fee: number;
    fromAddress: string | null;
    toAddress: string | null;
    txHash: string | null;
    createdAt: string;
  }>;
};

type DepositAddressResponse = {
  address: string;
  memo?: string | null;
  warningNote?: string | null;
};

const SUPPORTED_ASSET = "USDT";
const SUPPORTED_DEPOSIT_NETWORKS = ["BEP20_BSC", "POLYGON_POS"] as const;
const ASSET_NAMES: Record<string, string> = {
  USDT: "Tether USD",
};
const PRICE_USD_BY_ASSET: Record<string, number> = {
  USDT: 1,
};

function normalizeStatus(status: ApiTransactionStatus): TransactionStatus {
  if (status === "CONFIRMED") return "COMPLETED";
  if (status === "CANCELED") return "FAILED";
  return status;
}

function mapApiTransaction(tx: NonNullable<TransactionsResponse["transactions"]>[number]): TransactionRow {
  return {
    txId: tx.txId,
    type: tx.type,
    status: normalizeStatus(tx.status),
    assetCode: tx.assetCode,
    networkCode: tx.networkCode,
    amount: Number(tx.amount ?? 0),
    fee: Number(tx.fee ?? 0),
    fromAddress: tx.fromAddress ?? "-",
    toAddress: tx.toAddress ?? "-",
    txHash: tx.txHash ?? tx.txId,
    createdAt: tx.createdAt,
  };
}

const STATUS_STYLE: Record<TransactionStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
  REVIEW: "bg-sky-500/15 text-sky-300 border border-sky-400/30",
  PROCESSING: "bg-indigo-500/15 text-indigo-300 border border-indigo-400/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
  FAILED: "bg-rose-500/15 text-rose-300 border border-rose-400/30",
};

function fmtAmount(value: number, digits = 8) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

function fmtUsd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmtVnd(value: number) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
}

function shortAddress(value: string) {
  if (value.length < 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

const vndRate = 25500;

type WalletDashboardProps = {
  userName: string;
};

export function WalletDashboard({ userName }: WalletDashboardProps) {
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const creditedDepositIdsRef = useRef(new Set<string>());

  const [depositAsset, setDepositAsset] = useState(SUPPORTED_ASSET);
  const [depositNetwork, setDepositNetwork] = useState<(typeof SUPPORTED_DEPOSIT_NETWORKS)[number]>("BEP20_BSC");
  const [depositAmount, setDepositAmount] = useState("300");
  const [depositState, setDepositState] = useState<DepositFlowState>("IDLE");
  const [lastDepositTxId, setLastDepositTxId] = useState<string | null>(null);
  const [lastDepositTxHash, setLastDepositTxHash] = useState<string | null>(null);
  const [depositAddressInfo, setDepositAddressInfo] = useState<DepositAddressResponse | null>(null);
  const [isLoadingDepositAddress, setIsLoadingDepositAddress] = useState(false);

  const [withdrawAsset, setWithdrawAsset] = useState(SUPPORTED_ASSET);
  const [withdrawNetwork, setWithdrawNetwork] = useState<(typeof SUPPORTED_DEPOSIT_NETWORKS)[number]>("BEP20_BSC");
  const [withdrawAmount, setWithdrawAmount] = useState("120");
  const [withdrawAddress, setWithdrawAddress] = useState("TRxD3w7Uq9eYx9n6Qj2uA8M9jQzF1b3eVt");
  const [withdrawState, setWithdrawState] = useState<WithdrawFlowState>("IDLE");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [lastWithdrawTxId, setLastWithdrawTxId] = useState<string | null>(null);

  const totalUsd = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.available + asset.locked) * asset.priceUsd, 0);
  }, [assets]);

  const totalVnd = totalUsd * vndRate;

  const depositRecent = transactions.filter((item) => item.type === "DEPOSIT").slice(0, 6);
  const withdrawRecent = transactions.filter((item) => item.type === "WITHDRAW").slice(0, 6);

  async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? `Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  async function loadOverview() {
    const data = await requestJson<OverviewResponse>("/api/wallet/overview", {
      method: "GET",
    });
    const nextAssets = (data.assets ?? []).map((asset) => ({
      id: `${asset.assetCode}-ALL`,
      assetCode: asset.assetCode,
      assetName: ASSET_NAMES[asset.assetCode] ?? asset.assetCode,
      networkCode: "ALL",
      available: Number(asset.available ?? 0),
      locked: Number(asset.locked ?? 0),
      priceUsd: PRICE_USD_BY_ASSET[asset.assetCode] ?? 1,
    }));
    setAssets(nextAssets);
  }

  const loadTransactions = useCallback(async () => {
    const data = await requestJson<TransactionsResponse>("/api/transactions", {
      method: "GET",
    });
    const nextTransactions = (data.transactions ?? []).map(mapApiTransaction);
    setTransactions(nextTransactions);
    creditedDepositIdsRef.current = new Set(
      nextTransactions.filter((tx) => tx.type === "DEPOSIT" && tx.status === "COMPLETED").map((tx) => tx.txId),
    );
  }, []);

  const refreshOverviewAndTransactions = useCallback(async () => {
    await Promise.all([loadOverview(), loadTransactions()]);
  }, [loadTransactions]);

  const loadDepositAddress = useCallback(async (networkCode: (typeof SUPPORTED_DEPOSIT_NETWORKS)[number]) => {
    setIsLoadingDepositAddress(true);
    try {
      const query = new URLSearchParams({
        assetCode: SUPPORTED_ASSET,
        networkCode,
      });
      const data = await requestJson<DepositAddressResponse>(`/api/wallet/deposit-address?${query.toString()}`, {
        method: "GET",
      });
      setDepositAddressInfo(data);
      setApiError(null);
    } catch (error) {
      setDepositAddressInfo(null);
      setApiError(error instanceof Error ? error.message : "Khong the tai dia chi nap.");
    } finally {
      setIsLoadingDepositAddress(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingData(true);
    setApiError(null);

    Promise.all([refreshOverviewAndTransactions(), loadDepositAddress(depositNetwork)])
      .catch((error) => {
        if (!isMounted) return;
        setApiError(error instanceof Error ? error.message : "Khong the tai du lieu wallet.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [depositNetwork, loadDepositAddress, refreshOverviewAndTransactions]);

  async function syncDepositNetwork(assetCode: string) {
    setDepositAsset(assetCode);
    setDepositNetwork("BEP20_BSC");
    setDepositState("IDLE");
    setLastDepositTxId(null);
    setLastDepositTxHash(null);
  }

  function syncWithdrawNetwork(assetCode: string) {
    const firstNetwork = "BEP20_BSC";
    setWithdrawAsset(assetCode);
    setWithdrawNetwork(firstNetwork);
    setWithdrawState("IDLE");
    setWithdrawError(null);
  }

  function jumpToDeposit(assetCode: string, networkCode: string) {
    setActiveView("deposit");
    setDepositAsset(assetCode);
    setDepositNetwork(
      SUPPORTED_DEPOSIT_NETWORKS.includes(networkCode as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])
        ? (networkCode as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])
        : "BEP20_BSC",
    );
    setDepositState("IDLE");
  }

  function jumpToWithdraw(assetCode: string, networkCode: string) {
    setActiveView("withdraw");
    setWithdrawAsset(assetCode);
    setWithdrawNetwork(
      SUPPORTED_DEPOSIT_NETWORKS.includes(networkCode as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])
        ? (networkCode as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])
        : "BEP20_BSC",
    );
    setWithdrawState("IDLE");
    setWithdrawError(null);
  }

  function upsertTransaction(tx: TransactionRow) {
    setTransactions((prev) => {
      const index = prev.findIndex((item) => item.txId === tx.txId);
      if (index === -1) return [tx, ...prev];
      const next = [...prev];
      next[index] = { ...prev[index], ...tx };
      return next;
    });
  }

  async function handleCreateDepositPending() {
    const amount = Number(depositAmount);
    if (!depositAddressInfo || Number.isNaN(amount) || amount < 1) {
      setActionNotice("Minimum deposit la 1 USDT.");
      return;
    }

    try {
      const data = await requestJson<{ transaction: TransactionsResponse["transactions"][number] }>("/api/dev/simulate-deposit", {
        method: "POST",
        body: JSON.stringify({
          assetCode: depositAsset,
          networkCode: depositNetwork,
          amount,
          action: "PENDING",
        }),
      });

      const mapped = mapApiTransaction(data.transaction);
      upsertTransaction(mapped);
      setLastDepositTxId(mapped.txId);
      setLastDepositTxHash(mapped.txHash);
      setDepositState("PENDING");
      setActionNotice("Da tao deposit PENDING.");
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "Khong the tao pending deposit.");
    }
  }

  async function handleConfirmDeposit() {
    if (!lastDepositTxId) {
      setActionNotice("Hay tao pending deposit truoc.");
      return;
    }

    const existing = transactions.find((item) => item.txId === lastDepositTxId);
    const amount = Number(existing?.amount ?? depositAmount);
    if (Number.isNaN(amount) || amount < 1) {
      setActionNotice("Minimum deposit la 1 USDT.");
      return;
    }

    try {
      const data = await requestJson<{ transaction: TransactionsResponse["transactions"][number] }>("/api/dev/simulate-deposit", {
        method: "POST",
        body: JSON.stringify({
          assetCode: existing?.assetCode ?? depositAsset,
          networkCode: existing?.networkCode ?? depositNetwork,
          amount,
          txHash: lastDepositTxHash ?? existing?.txHash,
          action: "COMPLETED",
        }),
      });

      const mapped = mapApiTransaction(data.transaction);
      upsertTransaction(mapped);
      setLastDepositTxId(mapped.txId);
      setLastDepositTxHash(mapped.txHash);
      setDepositState("COMPLETED");
      setActionNotice("Da xac nhan blockchain COMPLETED.");
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "Khong the xac nhan deposit.");
    }
  }

  async function handleFailDeposit() {
    if (!lastDepositTxId) {
      setActionNotice("Hay tao pending deposit truoc.");
      return;
    }

    const existing = transactions.find((item) => item.txId === lastDepositTxId);
    const amount = Number(existing?.amount ?? depositAmount);
    if (Number.isNaN(amount) || amount < 1) {
      setActionNotice("Minimum deposit la 1 USDT.");
      return;
    }

    try {
      const data = await requestJson<{ transaction: TransactionsResponse["transactions"][number] }>("/api/dev/simulate-deposit", {
        method: "POST",
        body: JSON.stringify({
          assetCode: existing?.assetCode ?? depositAsset,
          networkCode: existing?.networkCode ?? depositNetwork,
          amount,
          txHash: lastDepositTxHash ?? existing?.txHash,
          action: "FAILED",
        }),
      });

      const mapped = mapApiTransaction(data.transaction);
      upsertTransaction(mapped);
      setDepositState("FAILED");
      setActionNotice("Da danh dau deposit FAILED.");
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "Khong the fail deposit.");
    }
  }

  async function handleSubmitWithdraw() {
    const amount = Number(withdrawAmount);
    setWithdrawError(null);

    if (Number.isNaN(amount) || amount <= 0) {
      setWithdrawError("Số lượng rút không hợp lệ.");
      return;
    }

    const targetAsset = assets.find((item) => item.assetCode === withdrawAsset);
    if (!targetAsset) {
      setWithdrawError("Khong tim thay vi asset.");
      return;
    }

    if (amount > targetAsset.available) {
      setWithdrawError("Số dư khả dụng không đủ để tạo yêu cầu rút.");
      return;
    }

    try {
      const data = await requestJson<{ transaction: TransactionsResponse["transactions"][number] }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          assetCode: withdrawAsset,
          networkCode: withdrawNetwork,
          destinationAddress: withdrawAddress,
          amount,
        }),
      });
      const mapped = mapApiTransaction(data.transaction);
      setLastWithdrawTxId(mapped.txId);
      setWithdrawState("REVIEW");
      setActionNotice("Da tao withdrawal request.");
      await refreshOverviewAndTransactions();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Khong the tao yeu cau rut.");
    }
  }

  async function handleRiskPassed() {
    if (!lastWithdrawTxId) {
      setWithdrawError("Hay submit withdrawal request truoc.");
      return;
    }
    try {
      await requestJson("/api/dev/simulate-withdraw-approve", {
        method: "POST",
        body: JSON.stringify({
          transactionId: lastWithdrawTxId,
        }),
      });
      setWithdrawState("PROCESSING");
      setActionNotice("Risk check da duyet.");
      await refreshOverviewAndTransactions();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Khong the approve withdrawal.");
    }
  }

  async function handleWithdrawCompleted() {
    if (!lastWithdrawTxId) {
      setWithdrawError("Hay submit withdrawal request truoc.");
      return;
    }
    try {
      await requestJson("/api/dev/simulate-withdraw-complete", {
        method: "POST",
        body: JSON.stringify({
          transactionId: lastWithdrawTxId,
        }),
      });
      setWithdrawState("COMPLETED");
      setActionNotice("Withdrawal da completed.");
      await refreshOverviewAndTransactions();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Khong the complete withdrawal.");
    }
  }

  async function handleWithdrawFailed() {
    if (!lastWithdrawTxId) {
      setWithdrawError("Hay submit withdrawal request truoc.");
      return;
    }
    try {
      await requestJson("/api/dev/simulate-withdraw-fail", {
        method: "POST",
        body: JSON.stringify({
          transactionId: lastWithdrawTxId,
        }),
      });
      setWithdrawState("FAILED");
      setActionNotice("Withdrawal da failed.");
      await refreshOverviewAndTransactions();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Khong the fail withdrawal.");
    }
  }

  const handleRealtimeDepositUpdated = useCallback((event: WalletDepositSocketEvent) => {
    let shouldApplyCredit = false;

    setTransactions((prev) => {
      const index = prev.findIndex((item) => item.txId === event.txId);

      const nextStatus = normalizeStatus(event.status);
      if (index === -1) {
        const nextTx: TransactionRow = {
          txId: event.txId,
          type: "DEPOSIT",
          status: nextStatus,
          assetCode: event.assetCode,
          networkCode: event.networkCode,
          amount: event.amount,
          fee: 0,
          fromAddress: "On-chain",
          toAddress: "RyanExchange wallet address",
          txHash: event.txHash ?? event.txId,
          createdAt: event.occurredAt,
        };

        if (nextStatus === "COMPLETED" && !creditedDepositIdsRef.current.has(event.txId)) {
          shouldApplyCredit = true;
        }
        return [nextTx, ...prev];
      }

      const existing = prev[index];
      const updated: TransactionRow = {
        ...existing,
        status: nextStatus,
        txHash: event.txHash ?? existing.txHash,
        createdAt: event.occurredAt ?? existing.createdAt,
      };

      if (nextStatus === "COMPLETED" && existing.status !== "COMPLETED" && !creditedDepositIdsRef.current.has(event.txId)) {
        shouldApplyCredit = true;
      }

      const next = [...prev];
      next[index] = updated;
      return next;
    });

    if (!shouldApplyCredit) return;
    creditedDepositIdsRef.current.add(event.txId);
    setAssets((prev) =>
      prev.length > 0
        ? prev.map((asset) => (asset.assetCode === event.assetCode ? { ...asset, available: asset.available + event.amount } : asset))
        : [
            {
              id: `${event.assetCode}-ALL`,
              assetCode: event.assetCode,
              assetName: ASSET_NAMES[event.assetCode] ?? event.assetCode,
              networkCode: "ALL",
              available: event.amount,
              locked: 0,
              priceUsd: PRICE_USD_BY_ASSET[event.assetCode] ?? 1,
            },
          ],
    );
  }, []);

  const { connectionStatus } = useWalletRealtime({
    onDepositUpdated: handleRealtimeDepositUpdated,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">RyanExchange Wallet</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">Xin chào, {userName}</h1>
              <p className="mt-2 text-sm text-zinc-400">Dashboard quan ly nap/rut theo backend MVP APIs + realtime deposit socket.</p>
              <p className="mt-2 text-xs text-zinc-500">
                Wallet realtime:
                {" "}
                <span
                  className={[
                    "font-semibold",
                    connectionStatus === "connected"
                      ? "text-emerald-300"
                      : connectionStatus === "connecting"
                        ? "text-amber-300"
                        : "text-rose-300",
                  ].join(" ")}
                >
                  {connectionStatus}
                </span>
              </p>
              {apiError && <p className="mt-2 text-xs text-rose-300">{apiError}</p>}
              {actionNotice && <p className="mt-2 text-xs text-emerald-300">{actionNotice}</p>}
            </div>
            <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-200/80">Tổng tài sản ước tính</p>
              <p className="mt-1 text-xl font-black text-orange-300 md:text-2xl">{fmtVnd(totalVnd)}</p>
              <p className="text-xs text-zinc-400">~ {fmtUsd(totalUsd)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
            <nav className="space-y-1">
              {[
                { key: "overview", label: "Wallet Overview" },
                { key: "deposit", label: "Deposit Flow" },
                { key: "withdraw", label: "Withdraw Flow" },
                { key: "history", label: "Transaction History" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveView(item.key as ViewKey)}
                  className={[
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
                    activeView === item.key ? "bg-orange-500/20 text-orange-300" : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-6">
            {isLoadingData && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <p className="text-sm text-zinc-300">Dang tai du lieu wallet...</p>
              </section>
            )}
            {activeView === "overview" && (
              <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {assets.map((asset) => (
                    <article key={asset.id} className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{asset.networkCode}</p>
                      <p className="mt-2 text-lg font-black text-white">{asset.assetCode}</p>
                      <p className="text-xs text-zinc-400">{asset.assetName}</p>
                      <p className="mt-4 text-sm text-zinc-300">Khả dụng: {fmtAmount(asset.available)} {asset.assetCode}</p>
                      <p className="text-sm text-zinc-400">Đang khóa: {fmtAmount(asset.locked)} {asset.assetCode}</p>
                    </article>
                  ))}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-white">Danh sách tài sản</h2>
                    <button
                      type="button"
                      className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-300"
                      onClick={() => setActiveView("history")}
                    >
                      Xem toàn bộ lịch sử
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                          <th className="px-3 py-3">Asset</th>
                          <th className="px-3 py-3">Network</th>
                          <th className="px-3 py-3">Available Balance</th>
                          <th className="px-3 py-3">Locked Balance</th>
                          <th className="px-3 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset) => (
                          <tr key={`${asset.assetCode}-${asset.networkCode}`} className="border-b border-zinc-900/80">
                            <td className="px-3 py-3 font-semibold text-white">{asset.assetCode}</td>
                            <td className="px-3 py-3 text-zinc-300">{asset.networkCode}</td>
                            <td className="px-3 py-3 text-zinc-100">{fmtAmount(asset.available)} {asset.assetCode}</td>
                            <td className="px-3 py-3 text-zinc-400">{fmtAmount(asset.locked)} {asset.assetCode}</td>
                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => jumpToDeposit(asset.assetCode, asset.networkCode)}
                                  className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-black"
                                >
                                  Deposit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => jumpToWithdraw(asset.assetCode, asset.networkCode)}
                                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-zinc-500"
                                >
                                  Withdraw
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
                  <h2 className="mb-4 text-lg font-black text-white">Recent transactions</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                          <th className="px-3 py-3">Mã giao dịch</th>
                          <th className="px-3 py-3">Loại</th>
                          <th className="px-3 py-3">Coin/Network</th>
                          <th className="px-3 py-3">Số lượng</th>
                          <th className="px-3 py-3">Trạng thái</th>
                          <th className="px-3 py-3">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 8).map((tx) => (
                          <tr key={tx.txId} className="border-b border-zinc-900/80">
                            <td className="px-3 py-3 text-zinc-300">{tx.txId}</td>
                            <td className="px-3 py-3 font-semibold text-white">{tx.type === "DEPOSIT" ? "Nạp" : "Rút"}</td>
                            <td className="px-3 py-3 text-zinc-300">{tx.assetCode} / {tx.networkCode}</td>
                            <td className="px-3 py-3 text-zinc-100">{fmtAmount(tx.amount)} {tx.assetCode}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[tx.status]}`}>{tx.status}</span>
                            </td>
                            <td className="px-3 py-3 text-zinc-400">{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeView === "deposit" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h2 className="text-xl font-black text-white">Deposit Flow</h2>
                  <p className="mt-1 text-sm text-zinc-400">Chon coin/network, he thong cap dia chi nap va ghi nhan PENDING/COMPLETED/FAILED.</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Coin</span>
                      <select
                        value={depositAsset}
                        onChange={(event) => void syncDepositNetwork(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                      >
                        {[SUPPORTED_ASSET].map((asset) => (
                          <option key={asset} value={asset}>
                            {asset}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Network</span>
                      <select
                        value={depositNetwork}
                        onChange={(event) => setDepositNetwork(event.target.value as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                      >
                        {SUPPORTED_DEPOSIT_NETWORKS.map((network) => (
                          <option key={network} value={network}>
                            {network}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Số lượng nạp (mock)</span>
                      <input
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                        inputMode="decimal"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Địa chỉ nạp được cấp</p>
                  <p className="mt-2 break-all rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-sm text-zinc-100">
                    {isLoadingDepositAddress ? "Dang tai..." : depositAddressInfo?.address ?? "Chua co dia chi cho network nay"}
                  </p>
                  {depositAddressInfo?.memo && <p className="mt-2 text-sm text-orange-300">Tag/Memo: {depositAddressInfo.memo}</p>}
                  <p className="mt-3 text-xs text-zinc-500">{depositAddressInfo?.warningNote ?? `Chi gui ${depositAsset} tren mang ${depositNetwork}.`}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCreateDepositPending}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black"
                    >
                      Tôi đã gửi coin (pending)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeposit}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                    >
                      Xác nhận blockchain (confirmed)
                    </button>
                    <button
                      type="button"
                      onClick={handleFailDeposit}
                      className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300"
                    >
                      Mark Failed
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h3 className="text-base font-bold text-white">Trạng thái luồng nạp</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {[
                      { key: "IDLE", label: "1. Tạo địa chỉ nạp" },
                      { key: "PENDING", label: "2. Pending on-chain" },
                      { key: "COMPLETED", label: "3. Completed + tang so du" },
                    ].map((step) => (
                      <div
                        key={step.key}
                        className={[
                          "rounded-lg border px-3 py-3 text-sm",
                          (depositState === step.key || (depositState === "COMPLETED" && step.key !== "IDLE") || (depositState === "PENDING" && step.key === "IDLE"))
                            ? "border-orange-400/40 bg-orange-500/10 text-orange-200"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500",
                        ].join(" ")}
                      >
                        {step.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h3 className="mb-4 text-base font-bold text-white">Lịch sử nạp gần đây</h3>
                  <div className="space-y-2">
                    {depositRecent.map((tx) => (
                      <div key={tx.txId} className="flex flex-col justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm md:flex-row md:items-center">
                        <p className="font-medium text-zinc-200">{tx.txId} - {tx.assetCode}/{tx.networkCode}</p>
                        <p className="text-zinc-400">{fmtAmount(tx.amount)} {tx.assetCode}</p>
                        <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[tx.status]}`}>{tx.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeView === "withdraw" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h2 className="text-xl font-black text-white">Withdraw Flow</h2>
                  <p className="mt-1 text-sm text-zinc-400">Tạo withdrawal request, review/risk check, xử lý và completed/failed.</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Coin</span>
                      <select
                        value={withdrawAsset}
                        onChange={(event) => syncWithdrawNetwork(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                      >
                        {[SUPPORTED_ASSET].map((asset) => (
                          <option key={asset} value={asset}>
                            {asset}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Network</span>
                      <select
                        value={withdrawNetwork}
                        onChange={(event) => setWithdrawNetwork(event.target.value as (typeof SUPPORTED_DEPOSIT_NETWORKS)[number])}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                      >
                        {SUPPORTED_DEPOSIT_NETWORKS.map((network) => (
                          <option key={network} value={network}>
                            {network}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Địa chỉ nhận</span>
                      <input
                        value={withdrawAddress}
                        onChange={(event) => setWithdrawAddress(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-400">Số lượng rút</span>
                      <input
                        value={withdrawAmount}
                        onChange={(event) => setWithdrawAmount(event.target.value)}
                        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none"
                        inputMode="decimal"
                      />
                    </label>
                  </div>

                  {withdrawError && <p className="mt-3 text-sm text-rose-300">{withdrawError}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSubmitWithdraw}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black"
                    >
                      Submit Withdrawal Request
                    </button>
                    <button
                      type="button"
                      onClick={handleRiskPassed}
                      className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-300"
                    >
                      Risk Check Passed
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawCompleted}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                    >
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawFailed}
                      className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300"
                    >
                      Mark Failed
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h3 className="text-base font-bold text-white">Trạng thái luồng rút</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    {[
                      { key: "REVIEW", label: "1. Review / Risk Check" },
                      { key: "PROCESSING", label: "2. Processing" },
                      { key: "COMPLETED", label: "3. Completed" },
                      { key: "FAILED", label: "4. Failed" },
                    ].map((step) => {
                      const isActive = withdrawState === step.key;
                      const isDone =
                        (withdrawState === "PROCESSING" && step.key === "REVIEW") ||
                        (withdrawState === "COMPLETED" && (step.key === "REVIEW" || step.key === "PROCESSING")) ||
                        (withdrawState === "FAILED" && (step.key === "REVIEW" || step.key === "PROCESSING"));

                      return (
                        <div
                          key={step.key}
                          className={[
                            "rounded-lg border px-3 py-3 text-sm",
                            isActive || isDone ? "border-orange-400/40 bg-orange-500/10 text-orange-200" : "border-zinc-800 bg-zinc-900 text-zinc-500",
                          ].join(" ")}
                        >
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">Khi `Submit`, hệ thống sẽ move số dư từ available sang locked. Nếu `Completed` thì locked giảm vĩnh viễn, nếu `Failed` thì release về available.</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <h3 className="mb-4 text-base font-bold text-white">Lịch sử rút gần đây</h3>
                  <div className="space-y-2">
                    {withdrawRecent.map((tx) => (
                      <div key={tx.txId} className="flex flex-col justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm md:flex-row md:items-center">
                        <p className="font-medium text-zinc-200">{tx.txId} - {shortAddress(tx.toAddress)}</p>
                        <p className="text-zinc-400">
                          {fmtAmount(tx.amount)} {tx.assetCode} (fee: {fmtAmount(tx.fee)})
                        </p>
                        <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[tx.status]}`}>{tx.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeView === "history" && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-black text-white">Transaction History</h2>
                  <p className="text-sm text-zinc-400">Nơi user nhìn thấy toàn bộ lịch sử deposit và withdraw</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                        <th className="px-3 py-3">Tx ID</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Asset</th>
                        <th className="px-3 py-3">Network</th>
                        <th className="px-3 py-3">Amount</th>
                        <th className="px-3 py-3">Fee</th>
                        <th className="px-3 py-3">From</th>
                        <th className="px-3 py-3">To</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Tx Hash</th>
                        <th className="px-3 py-3">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.txId} className="border-b border-zinc-900/80 align-top">
                          <td className="px-3 py-3 text-zinc-300">{tx.txId}</td>
                          <td className="px-3 py-3 font-semibold text-white">{tx.type}</td>
                          <td className="px-3 py-3 text-zinc-300">{tx.assetCode}</td>
                          <td className="px-3 py-3 text-zinc-300">{tx.networkCode}</td>
                          <td className="px-3 py-3 text-zinc-100">{fmtAmount(tx.amount)}</td>
                          <td className="px-3 py-3 text-zinc-300">{fmtAmount(tx.fee)}</td>
                          <td className="px-3 py-3 text-zinc-500">{shortAddress(tx.fromAddress)}</td>
                          <td className="px-3 py-3 text-zinc-500">{shortAddress(tx.toAddress)}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[tx.status]}`}>{tx.status}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-zinc-500">{shortAddress(tx.txHash)}</td>
                          <td className="px-3 py-3 text-zinc-400">{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

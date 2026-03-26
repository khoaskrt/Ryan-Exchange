import { Prisma, TransactionStatus, TransactionType, type WalletTransaction } from "@prisma/client";
import { createHash } from "crypto";

import { prisma } from "@/lib/server/prisma";
import { emitWalletDepositUpdateToUser } from "@/lib/server/realtime";
import { type WalletDepositSocketEvent } from "@/lib/socket/events";

export const SUPPORTED_WALLET_ASSET = "USDT";
export const SUPPORTED_WALLET_NETWORKS = ["BEP20_BSC", "POLYGON_POS"] as const;
export const MIN_DEPOSIT_AMOUNT = new Prisma.Decimal(1);

export const NETWORK_CONFIRMATION_THRESHOLDS: Record<(typeof SUPPORTED_WALLET_NETWORKS)[number], number> = {
  BEP20_BSC: 12,
  POLYGON_POS: 64,
};

const RETRYABLE_ERROR_CODES = new Set(["TRANSIENT_SIMULATED", "TRANSIENT_INTERNAL"]);

type RetryStateStore = Map<string, number>;

function getRetryStateStore(): RetryStateStore {
  const globalRef = globalThis as unknown as { __walletMvpRetryState?: RetryStateStore };
  if (!globalRef.__walletMvpRetryState) {
    globalRef.__walletMvpRetryState = new Map<string, number>();
  }
  return globalRef.__walletMvpRetryState;
}

export function toDecimal(value: string | number) {
  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function isSupportedWalletNetwork(networkCode: string): networkCode is (typeof SUPPORTED_WALLET_NETWORKS)[number] {
  return SUPPORTED_WALLET_NETWORKS.includes(networkCode as (typeof SUPPORTED_WALLET_NETWORKS)[number]);
}

export function getRequiredConfirmations(networkCode: string) {
  if (!isSupportedWalletNetwork(networkCode)) return null;
  return NETWORK_CONFIRMATION_THRESHOLDS[networkCode];
}

export function deterministicDepositAddress(userId: string, assetCode: string, networkCode: string) {
  const hash = createHash("sha256")
    .update(`${userId}:${assetCode}:${networkCode}:wallet-mvp-address`)
    .digest("hex");
  return `0x${hash.slice(0, 40)}`;
}

export function getDepositDedupeHash(input: {
  userId: string;
  assetCode: string;
  networkCode: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
}) {
  const hash = createHash("sha256")
    .update(
      [
        input.userId,
        input.assetCode,
        input.networkCode,
        input.amount,
        input.fromAddress.toLowerCase(),
        input.toAddress.toLowerCase(),
      ].join(":"),
    )
    .digest("hex");
  return `sim-${hash.slice(0, 48)}`;
}

export async function ensureWalletBalanceRow(tx: Prisma.TransactionClient, userId: string, assetCode: string) {
  const existing = await tx.walletBalance.findUnique({
    where: { userId_asset: { userId, asset: assetCode } },
  });

  if (existing) return existing;

  return tx.walletBalance.create({
    data: {
      userId,
      asset: assetCode,
      available: new Prisma.Decimal(0),
      locked: new Prisma.Decimal(0),
    },
  });
}

export function serializeWalletTransaction(transaction: WalletTransaction) {
  return {
    txId: transaction.txId,
    type: transaction.type,
    assetCode: transaction.assetCode,
    networkCode: transaction.networkCode,
    amount: decimalToNumber(transaction.amount),
    fee: decimalToNumber(transaction.fee),
    status: transaction.status,
    txHash: transaction.txHash,
    fromAddress: transaction.fromAddress,
    toAddress: transaction.toAddress,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export async function getOrCreateDepositAddress(input: {
  userId: string;
  assetCode: string;
  networkCode: (typeof SUPPORTED_WALLET_NETWORKS)[number];
}) {
  const existing = await prisma.depositAddress.findFirst({
    where: {
      userId: input.userId,
      assetCode: input.assetCode,
      networkCode: input.networkCode,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  const address = deterministicDepositAddress(input.userId, input.assetCode, input.networkCode);

  return prisma.depositAddress.upsert({
    where: {
      networkCode_address: {
        networkCode: input.networkCode,
        address,
      },
    },
    update: {
      userId: input.userId,
      assetCode: input.assetCode,
      status: "ACTIVE",
      tagMemo: null,
    },
    create: {
      userId: input.userId,
      assetCode: input.assetCode,
      networkCode: input.networkCode,
      address,
      tagMemo: null,
      provider: "SIMULATED_PROVIDER",
      status: "ACTIVE",
    },
  });
}

export async function emitDepositRealtimeEvent(userId: string, transaction: WalletTransaction) {
  const event: WalletDepositSocketEvent = {
    txId: transaction.txId,
    assetCode: transaction.assetCode,
    networkCode: transaction.networkCode,
    amount: decimalToNumber(transaction.amount),
    status: mapDepositStatusForSocket(transaction.status),
    txHash: transaction.txHash ?? undefined,
    occurredAt: new Date().toISOString(),
  };

  return emitWalletDepositUpdateToUser(userId, event);
}

function mapDepositStatusForSocket(status: TransactionStatus): WalletDepositSocketEvent["status"] {
  if (status === TransactionStatus.COMPLETED) return "COMPLETED";
  if (status === TransactionStatus.FAILED || status === TransactionStatus.CANCELED) return "FAILED";
  return "PENDING";
}

export function seedTransientFailureIfNeeded(key: string, failures: number | undefined) {
  if (!failures || failures <= 0) return;
  const store = getRetryStateStore();
  if (!store.has(key)) {
    store.set(key, failures);
  }
}

function consumeTransientFailure(key: string) {
  const store = getRetryStateStore();
  const remaining = store.get(key);
  if (!remaining || remaining <= 0) return false;
  store.set(key, remaining - 1);
  return true;
}

export async function runWithTransientRetry<T>(options: {
  stage: "INGEST" | "CREDIT";
  txKey: string;
  maxRetries?: number;
  fn: (attempt: number) => Promise<T>;
}) {
  const maxRetries = options.maxRetries ?? 2;
  const retryKey = `${options.stage}:${options.txKey}`;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      attempt += 1;
      if (consumeTransientFailure(retryKey)) {
        const error = new Error(`Simulated transient error at ${options.stage}`);
        error.name = "TRANSIENT_SIMULATED";
        throw error;
      }
      return await options.fn(attempt);
    } catch (error) {
      const code = error instanceof Error ? error.name : "UNKNOWN";
      const shouldRetry = RETRYABLE_ERROR_CODES.has(code) && attempt <= maxRetries;
      console.warn("[wallet-mvp] retry-handler", {
        stage: options.stage,
        txKey: options.txKey,
        attempt,
        maxRetries,
        code,
        willRetry: shouldRetry,
      });
      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw new Error("Retry handler exhausted unexpectedly.");
}

export function assertDepositReadyToCredit(transaction: WalletTransaction) {
  if (transaction.type !== TransactionType.DEPOSIT) {
    throw new Error("INVALID_TX_TYPE");
  }
  if (transaction.status === TransactionStatus.COMPLETED) {
    return;
  }
  if (transaction.status === TransactionStatus.FAILED || transaction.status === TransactionStatus.CANCELED) {
    throw new Error("TX_NOT_CREDITABLE");
  }
}

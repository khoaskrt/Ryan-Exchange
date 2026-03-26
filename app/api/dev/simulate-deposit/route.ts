import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import {
  MIN_DEPOSIT_AMOUNT,
  SUPPORTED_WALLET_ASSET,
  assertDepositReadyToCredit,
  emitDepositRealtimeEvent,
  ensureWalletBalanceRow,
  getDepositDedupeHash,
  getOrCreateDepositAddress,
  getRequiredConfirmations,
  isSupportedWalletNetwork,
  runWithTransientRetry,
  seedTransientFailureIfNeeded,
  serializeWalletTransaction,
  toDecimal,
} from "@/lib/server/wallet-mvp";

const requestSchema = z.object({
  assetCode: z.string().trim().min(1),
  networkCode: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  txHash: z.string().trim().min(6).optional(),
  fromAddress: z.string().trim().min(3).optional(),
  toAddress: z.string().trim().min(3).optional(),
  action: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
  simulateTransientIngestFailures: z.coerce.number().int().min(0).max(2).optional(),
  simulateTransientCreditFailures: z.coerce.number().int().min(0).max(2).optional(),
});

function isDevEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: NextRequest) {
  if (!isDevEnabled()) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request payload." },
      { status: 400 },
    );
  }

  const action = parsed.data.action ?? "PENDING";
  if (parsed.data.assetCode !== SUPPORTED_WALLET_ASSET) {
    return NextResponse.json({ message: "Only USDT is supported in MVP." }, { status: 400 });
  }
  if (!isSupportedWalletNetwork(parsed.data.networkCode)) {
    return NextResponse.json({ message: "Unsupported networkCode." }, { status: 400 });
  }
  if (toDecimal(parsed.data.amount).lt(MIN_DEPOSIT_AMOUNT)) {
    return NextResponse.json({ message: "Minimum deposit is 1 USDT." }, { status: 400 });
  }

  const depositAddress = await getOrCreateDepositAddress({
    userId: user.id,
    assetCode: parsed.data.assetCode,
    networkCode: parsed.data.networkCode,
  });

  const amountDecimal = toDecimal(parsed.data.amount);
  const fromAddress = parsed.data.fromAddress ?? "simulated-external-wallet";
  const toAddress = parsed.data.toAddress ?? depositAddress.address;
  const txHash =
    parsed.data.txHash?.toLowerCase() ??
    getDepositDedupeHash({
      userId: user.id,
      assetCode: parsed.data.assetCode,
      networkCode: parsed.data.networkCode,
      amount: amountDecimal.toString(),
      fromAddress,
      toAddress,
    });

  const requiredConfirmations = getRequiredConfirmations(parsed.data.networkCode);
  const txKey = `${user.id}:${txHash}`;
  seedTransientFailureIfNeeded(`INGEST:${txKey}`, parsed.data.simulateTransientIngestFailures);
  seedTransientFailureIfNeeded(`CREDIT:${txKey}`, parsed.data.simulateTransientCreditFailures);

  try {
    const pendingTx = await runWithTransientRetry({
      stage: "INGEST",
      txKey,
      maxRetries: 2,
      fn: async () => {
        const existing = await prisma.walletTransaction.findFirst({
          where: {
            userId: user.id,
            type: TransactionType.DEPOSIT,
            txHash,
          },
          orderBy: { createdAt: "desc" },
        });
        if (existing) return existing;

        return prisma.walletTransaction.create({
          data: {
            userId: user.id,
            type: TransactionType.DEPOSIT,
            assetCode: parsed.data.assetCode,
            networkCode: parsed.data.networkCode,
            amount: amountDecimal,
            fee: new Prisma.Decimal(0),
            status: TransactionStatus.PENDING,
            txHash,
            fromAddress,
            toAddress,
          },
        });
      },
    });

    await emitDepositRealtimeEvent(user.id, pendingTx);

    if (action === "PENDING") {
      return NextResponse.json(
        {
          transaction: serializeWalletTransaction(pendingTx),
          simulation: {
            state: "Pending",
            requiredConfirmations,
            note: requiredConfirmations
              ? `Pending -> Completed simulated at threshold ${requiredConfirmations} confirmations.`
              : null,
          },
        },
        { status: 201 },
      );
    }

    if (action === "FAILED") {
      const failed = await prisma.walletTransaction.update({
        where: { txId: pendingTx.txId },
        data: { status: TransactionStatus.FAILED },
      });
      await emitDepositRealtimeEvent(user.id, failed);
      return NextResponse.json(
        {
          transaction: serializeWalletTransaction(failed),
          simulation: {
            state: "Failed",
            requiredConfirmations,
          },
        },
        { status: 200 },
      );
    }

    const completedTx = await runWithTransientRetry({
      stage: "CREDIT",
      txKey,
      maxRetries: 2,
      fn: async () => {
        const result = await prisma.$transaction(async (tx) => {
          const current = await tx.walletTransaction.findUnique({
            where: { txId: pendingTx.txId },
          });
          if (!current) throw new Error("TX_NOT_FOUND");

          assertDepositReadyToCredit(current);
          if (current.status === TransactionStatus.COMPLETED) return current;

          const balance = await ensureWalletBalanceRow(tx, user.id, parsed.data.assetCode);
          const availableBefore = balance.available;
          const availableAfter = availableBefore.add(current.amount);

          const updatedTx = await tx.walletTransaction.update({
            where: { txId: current.txId },
            data: { status: TransactionStatus.COMPLETED },
          });

          await tx.walletBalance.update({
            where: { userId_asset: { userId: user.id, asset: parsed.data.assetCode } },
            data: { available: { increment: current.amount } },
          });

          await tx.walletLedgerEntry.create({
            data: {
              userId: user.id,
              transactionId: current.txId,
              entryType: "CREDIT",
              amount: current.amount,
              assetCode: current.assetCode,
              balanceBefore: availableBefore,
              balanceAfter: availableAfter,
            },
          });

          return updatedTx;
        });

        return result;
      },
    });

    await emitDepositRealtimeEvent(user.id, completedTx);

    return NextResponse.json(
      {
        transaction: serializeWalletTransaction(completedTx),
        simulation: {
          state: "Completed",
          requiredConfirmations,
          note: requiredConfirmations
            ? `Pending -> Completed simulated at threshold ${requiredConfirmations} confirmations.`
            : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TX_NOT_CREDITABLE") {
        return NextResponse.json({ message: "Transaction is not creditable in current state." }, { status: 409 });
      }
      if (error.message === "TX_NOT_FOUND") {
        return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
      }
    }

    console.error("[simulate-deposit] failed", {
      userId: user.id,
      txHash,
      action,
      error,
    });
    return NextResponse.json({ message: "Unable to simulate deposit right now." }, { status: 500 });
  }
}

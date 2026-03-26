import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import {
  SUPPORTED_WALLET_ASSET,
  decimalToNumber,
  ensureWalletBalanceRow,
  isSupportedWalletNetwork,
  serializeWalletTransaction,
  toDecimal,
} from "@/lib/server/wallet-mvp";

const requestSchema = z.object({
  assetCode: z.string().trim().min(1),
  networkCode: z.string().trim().min(1),
  destinationAddress: z.string().trim().min(8),
  amount: z.coerce.number().positive(),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid request payload." }, { status: 400 });
  }

  if (parsed.data.assetCode !== SUPPORTED_WALLET_ASSET) {
    return NextResponse.json({ message: "Only USDT is supported in MVP." }, { status: 400 });
  }
  if (!isSupportedWalletNetwork(parsed.data.networkCode)) {
    return NextResponse.json({ message: "Unsupported networkCode." }, { status: 400 });
  }

  const amount = toDecimal(parsed.data.amount);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balance = await ensureWalletBalanceRow(tx, user.id, parsed.data.assetCode);
      if (balance.available.lt(amount)) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const availableBefore = balance.available;
      const availableAfter = availableBefore.sub(amount);

      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: TransactionType.WITHDRAW,
          assetCode: parsed.data.assetCode,
          networkCode: parsed.data.networkCode,
          amount,
          fee: new Prisma.Decimal(0),
          status: TransactionStatus.REVIEW,
          toAddress: parsed.data.destinationAddress,
          fromAddress: "internal-treasury-wallet",
        },
      });

      const requestRow = await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          transactionId: transaction.txId,
          destinationAddress: parsed.data.destinationAddress,
          approvalStatus: "PENDING",
          riskResult: "SIMULATED_PENDING_REVIEW",
        },
      });

      await tx.walletBalance.update({
        where: { userId_asset: { userId: user.id, asset: parsed.data.assetCode } },
        data: {
          available: { decrement: amount },
          locked: { increment: amount },
        },
      });

      await tx.walletLedgerEntry.create({
        data: {
          userId: user.id,
          transactionId: transaction.txId,
          entryType: "HOLD",
          amount: amount.neg(),
          assetCode: parsed.data.assetCode,
          balanceBefore: availableBefore,
          balanceAfter: availableAfter,
        },
      });

      return { transaction, requestRow };
    });

    return NextResponse.json(
      {
        transaction: serializeWalletTransaction(result.transaction),
        withdrawalRequest: {
          requestId: result.requestRow.requestId,
          approvalStatus: result.requestRow.approvalStatus,
          createdAt: result.requestRow.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ message: "Insufficient available balance." }, { status: 409 });
    }
    console.error("[withdrawals] create failed", { userId: user.id, error });
    return NextResponse.json({ message: "Unable to create withdrawal request right now." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const withdrawals = await prisma.walletTransaction.findMany({
    where: {
      userId: user.id,
      type: TransactionType.WITHDRAW,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    {
      withdrawals: withdrawals.map((item) => ({
        ...serializeWalletTransaction(item),
        amount: decimalToNumber(item.amount),
      })),
    },
    { status: 200 },
  );
}

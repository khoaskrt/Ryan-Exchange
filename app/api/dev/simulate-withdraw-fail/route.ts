import { TransactionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import { ensureWalletBalanceRow, serializeWalletTransaction } from "@/lib/server/wallet-mvp";

const requestSchema = z
  .object({
    requestId: z.string().trim().min(1).optional(),
    transactionId: z.string().trim().min(1).optional(),
  })
  .refine((data) => Boolean(data.requestId || data.transactionId), {
    message: "requestId or transactionId is required.",
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
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid request payload." }, { status: 400 });
  }

  const record = await prisma.withdrawalRequest.findFirst({
    where: {
      userId: user.id,
      ...(parsed.data.requestId
        ? { requestId: parsed.data.requestId }
        : { transactionId: parsed.data.transactionId }),
    },
    include: { transaction: true },
  });

  if (!record) {
    return NextResponse.json({ message: "Withdrawal request not found." }, { status: 404 });
  }

  if (record.transaction.status === TransactionStatus.COMPLETED) {
    return NextResponse.json({ message: "Cannot fail a completed withdrawal." }, { status: 409 });
  }

  if (record.transaction.status === TransactionStatus.FAILED) {
    return NextResponse.json(
      {
        transaction: serializeWalletTransaction(record.transaction),
        idempotent: true,
      },
      { status: 200 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.findUniqueOrThrow({
      where: { txId: record.transactionId },
    });
    const balance = await ensureWalletBalanceRow(tx, user.id, transaction.assetCode);
    const availableBefore = balance.available;
    const availableAfter = availableBefore.add(transaction.amount);

    const updatedTx = await tx.walletTransaction.update({
      where: { txId: transaction.txId },
      data: { status: TransactionStatus.FAILED },
    });

    await tx.withdrawalRequest.update({
      where: { requestId: record.requestId },
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: "SIMULATED_FAILURE",
      },
    });

    await tx.walletBalance.update({
      where: { userId_asset: { userId: user.id, asset: transaction.assetCode } },
      data: {
        available: { increment: transaction.amount },
        locked: { decrement: transaction.amount },
      },
    });

    await tx.walletLedgerEntry.create({
      data: {
        userId: user.id,
        transactionId: transaction.txId,
        entryType: "RELEASE",
        amount: transaction.amount,
        assetCode: transaction.assetCode,
        balanceBefore: availableBefore,
        balanceAfter: availableAfter,
      },
    });

    return updatedTx;
  });

  return NextResponse.json(
    {
      transaction: serializeWalletTransaction(result),
    },
    { status: 200 },
  );
}

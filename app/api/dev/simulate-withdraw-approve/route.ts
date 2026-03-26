import { TransactionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import { serializeWalletTransaction } from "@/lib/server/wallet-mvp";

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

  if (record.transaction.status === TransactionStatus.COMPLETED || record.transaction.status === TransactionStatus.FAILED) {
    return NextResponse.json({ message: "Cannot approve terminal withdrawal state." }, { status: 409 });
  }

  if (record.approvalStatus === "APPROVED" && record.transaction.status === TransactionStatus.PROCESSING) {
    return NextResponse.json(
      {
        transaction: serializeWalletTransaction(record.transaction),
        withdrawalRequest: {
          requestId: record.requestId,
          approvalStatus: record.approvalStatus,
          updatedAt: record.updatedAt,
        },
        idempotent: true,
      },
      { status: 200 },
    );
  }

  if (record.transaction.status !== TransactionStatus.REVIEW) {
    return NextResponse.json({ message: "Withdrawal must be in REVIEW to approve." }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.update({
      where: { txId: record.transactionId },
      data: { status: TransactionStatus.PROCESSING },
    });
    const requestRow = await tx.withdrawalRequest.update({
      where: { requestId: record.requestId },
      data: {
        approvalStatus: "APPROVED",
        rejectionReason: null,
      },
    });
    return { transaction, requestRow };
  });

  return NextResponse.json(
    {
      transaction: serializeWalletTransaction(updated.transaction),
      withdrawalRequest: {
        requestId: updated.requestRow.requestId,
        approvalStatus: updated.requestRow.approvalStatus,
        updatedAt: updated.requestRow.updatedAt,
      },
    },
    { status: 200 },
  );
}

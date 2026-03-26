import { TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import { serializeWalletTransaction } from "@/lib/server/wallet-mvp";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      userId: user.id,
      type: {
        in: [TransactionType.DEPOSIT, TransactionType.WITHDRAW],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    {
      transactions: transactions.map(serializeWalletTransaction),
    },
    { status: 200 },
  );
}

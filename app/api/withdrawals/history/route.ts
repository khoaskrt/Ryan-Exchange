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
      withdrawals: withdrawals.map(serializeWalletTransaction),
    },
    { status: 200 },
  );
}

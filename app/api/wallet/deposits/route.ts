import { TransactionStatus, TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import { serializeWalletTransaction } from "@/lib/server/wallet-mvp";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = statusParam ? TransactionStatus[statusParam as keyof typeof TransactionStatus] : undefined;
  if (statusParam && !status) {
    return NextResponse.json({ message: "Invalid status query." }, { status: 400 });
  }

  const deposits = await prisma.walletTransaction.findMany({
    where: {
      userId: user.id,
      type: TransactionType.DEPOSIT,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    {
      deposits: deposits.map(serializeWalletTransaction),
    },
    { status: 200 },
  );
}

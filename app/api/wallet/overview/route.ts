import { TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import {
  SUPPORTED_WALLET_ASSET,
  decimalToNumber,
  serializeWalletTransaction,
} from "@/lib/server/wallet-mvp";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const limitInput = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const recentLimit = Number.isFinite(limitInput) ? Math.max(10, Math.min(100, Math.floor(limitInput))) : 10;

  const [balance, recentDeposits] = await Promise.all([
    prisma.walletBalance.findUnique({
      where: {
        userId_asset: {
          userId: user.id,
          asset: SUPPORTED_WALLET_ASSET,
        },
      },
    }),
    prisma.walletTransaction.findMany({
      where: {
        userId: user.id,
        type: TransactionType.DEPOSIT,
        assetCode: SUPPORTED_WALLET_ASSET,
      },
      orderBy: { createdAt: "desc" },
      take: recentLimit,
    }),
  ]);

  const available = decimalToNumber(balance?.available);
  const locked = decimalToNumber(balance?.locked);
  const total = available + locked;

  return NextResponse.json(
    {
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
      summary: {
        assetCode: SUPPORTED_WALLET_ASSET,
        total,
        available,
        locked,
      },
      assets: [
        {
          assetCode: SUPPORTED_WALLET_ASSET,
          total,
          available,
          locked,
        },
      ],
      recentDeposits: recentDeposits.map(serializeWalletTransaction),
    },
    { status: 200 },
  );
}

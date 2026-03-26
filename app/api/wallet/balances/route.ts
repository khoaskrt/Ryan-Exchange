import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";

function toNumber(value: { toString: () => string } | number) {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const balances = await prisma.walletBalance.findMany({
    where: { userId: user.id },
    orderBy: { asset: "asc" },
  });

  return NextResponse.json(
    {
      balances: balances.map((balance) => ({
        asset: balance.asset,
        available: toNumber(balance.available),
        locked: toNumber(balance.locked),
        total: toNumber(balance.available) + toNumber(balance.locked),
      })),
    },
    { status: 200 },
  );
}

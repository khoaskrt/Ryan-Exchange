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

  const ledger = await prisma.ledgerEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return NextResponse.json(
    {
      entries: ledger.map((entry) => ({
        id: entry.id,
        asset: entry.asset,
        amount: toNumber(entry.amount),
        entryType: entry.entryType,
        referenceId: entry.referenceId,
        note: entry.note,
        createdAt: entry.createdAt,
      })),
    },
    { status: 200 },
  );
}

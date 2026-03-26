import { NextRequest, NextResponse } from "next/server";

import { isAnalyticsAdmin } from "@/lib/server/env";
import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  if (!isAnalyticsAdmin(user.email)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, createdAt: true, firstTradeAt: true },
  });

  const totalUsers = users.length;
  const activatedUsers = users.filter((item) => item.firstTradeAt != null).length;
  const activatedWithin24h = users.filter((item) => {
    if (!item.firstTradeAt) return false;
    return item.firstTradeAt.getTime() - item.createdAt.getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  const activationRate = totalUsers > 0 ? Number(((activatedWithin24h / totalUsers) * 100).toFixed(2)) : 0;

  return NextResponse.json(
    {
      summary: {
        totalUsers,
        activatedUsers,
        activatedWithin24h,
        activationRate,
      },
      generatedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}

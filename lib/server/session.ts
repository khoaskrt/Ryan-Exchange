import { AccountStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, accountStatus: true, createdAt: true, firstTradeAt: true },
    });

    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

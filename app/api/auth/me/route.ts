import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const payload = await verifySessionToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

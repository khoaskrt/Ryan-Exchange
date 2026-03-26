import { NextResponse } from "next/server";

import { getMarkets } from "@/lib/server/markets";

export async function GET() {
  const markets = getMarkets();
  return NextResponse.json({ markets }, { status: 200 });
}

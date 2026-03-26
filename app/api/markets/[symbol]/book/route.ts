import { NextResponse } from "next/server";

import { getOrderBook, normalizeSymbol } from "@/lib/server/markets";

type Context = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_: Request, context: Context) {
  const { symbol } = await context.params;
  const normalized = normalizeSymbol(decodeURIComponent(symbol));
  const book = getOrderBook(normalized);

  if (!book) {
    return NextResponse.json({ message: "Market symbol not supported." }, { status: 404 });
  }

  return NextResponse.json({ symbol: normalized, ...book }, { status: 200 });
}

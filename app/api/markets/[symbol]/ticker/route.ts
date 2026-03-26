import { NextResponse } from "next/server";

import { getMarketBySymbol, getOrderBook, normalizeSymbol } from "@/lib/server/markets";

type Context = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_: Request, context: Context) {
  const { symbol } = await context.params;
  const normalized = normalizeSymbol(decodeURIComponent(symbol));
  const market = getMarketBySymbol(normalized);
  const book = getOrderBook(normalized);

  if (!market || !book) {
    return NextResponse.json({ message: "Market symbol not supported." }, { status: 404 });
  }

  const bestBid = book.bids[0]?.price ?? market.lastPrice;
  const bestAsk = book.asks[0]?.price ?? market.lastPrice;

  return NextResponse.json(
    {
      symbol: market.symbol,
      lastPrice: market.lastPrice,
      change24h: market.change24h,
      volume24h: market.volume24h,
      bestBid,
      bestAsk,
      spread: Number((bestAsk - bestBid).toFixed(8)),
    },
    { status: 200 },
  );
}

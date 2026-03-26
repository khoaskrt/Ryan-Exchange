export type MarketLevel = {
  price: number;
  quantity: number;
};

export type MarketSnapshot = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  change24h: number;
  volume24h: number;
};

type MarketBook = {
  bids: MarketLevel[];
  asks: MarketLevel[];
};

const MARKET_SNAPSHOTS: MarketSnapshot[] = [
  { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", lastPrice: 68450, change24h: 1.82, volume24h: 15438820 },
  { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", lastPrice: 3240, change24h: -0.34, volume24h: 11893340 },
  { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", lastPrice: 178.4, change24h: 3.22, volume24h: 6624420 },
  { symbol: "BNB/USDT", baseAsset: "BNB", quoteAsset: "USDT", lastPrice: 592.3, change24h: 0.95, volume24h: 4882750 },
  { symbol: "XRP/USDT", baseAsset: "XRP", quoteAsset: "USDT", lastPrice: 0.74, change24h: -1.2, volume24h: 4215530 },
];

const MARKET_BOOKS: Record<string, MarketBook> = {
  "BTC/USDT": {
    bids: [
      { price: 68420, quantity: 0.45 },
      { price: 68400, quantity: 0.9 },
      { price: 68370, quantity: 1.25 },
      { price: 68320, quantity: 1.6 },
    ],
    asks: [
      { price: 68460, quantity: 0.35 },
      { price: 68490, quantity: 0.7 },
      { price: 68530, quantity: 1.15 },
      { price: 68580, quantity: 1.5 },
    ],
  },
  "ETH/USDT": {
    bids: [
      { price: 3238, quantity: 5.8 },
      { price: 3235, quantity: 8.4 },
      { price: 3232, quantity: 11.2 },
      { price: 3228, quantity: 15.1 },
    ],
    asks: [
      { price: 3242, quantity: 4.9 },
      { price: 3245, quantity: 7.7 },
      { price: 3248, quantity: 10.3 },
      { price: 3252, quantity: 13.8 },
    ],
  },
  "SOL/USDT": {
    bids: [
      { price: 178.2, quantity: 220 },
      { price: 178.0, quantity: 290 },
      { price: 177.8, quantity: 330 },
      { price: 177.4, quantity: 390 },
    ],
    asks: [
      { price: 178.6, quantity: 210 },
      { price: 178.8, quantity: 280 },
      { price: 179.1, quantity: 360 },
      { price: 179.4, quantity: 410 },
    ],
  },
  "BNB/USDT": {
    bids: [
      { price: 592.1, quantity: 28 },
      { price: 591.8, quantity: 44 },
      { price: 591.2, quantity: 66 },
    ],
    asks: [
      { price: 592.6, quantity: 24 },
      { price: 593.0, quantity: 39 },
      { price: 593.5, quantity: 51 },
    ],
  },
  "XRP/USDT": {
    bids: [
      { price: 0.739, quantity: 9800 },
      { price: 0.738, quantity: 12000 },
      { price: 0.736, quantity: 14800 },
    ],
    asks: [
      { price: 0.741, quantity: 9300 },
      { price: 0.742, quantity: 11800 },
      { price: 0.744, quantity: 15200 },
    ],
  },
};

export function normalizeSymbol(input: string) {
  return input.trim().toUpperCase();
}

export function getMarkets() {
  return MARKET_SNAPSHOTS;
}

export function getMarketBySymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  return MARKET_SNAPSHOTS.find((market) => market.symbol === normalized) ?? null;
}

export function getOrderBook(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const book = MARKET_BOOKS[normalized];
  if (!book) return null;
  return {
    bids: [...book.bids],
    asks: [...book.asks],
  };
}

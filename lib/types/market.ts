export type Asset = {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  change24h: number;
};

export type Order = {
  id: string;
  pair: string;
  side: "Buy" | "Sell";
  amount: string;
  price: string;
  status: "Filled" | "Open" | "Partially Filled";
  createdAt: string;
};

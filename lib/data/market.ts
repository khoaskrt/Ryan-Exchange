import type { Asset, Order } from "@/lib/types/market";

export const portfolio: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", balance: "2.455 BTC", usdValue: "$168,404", change24h: 2.34 },
  { symbol: "ETH", name: "Ethereum", balance: "31.80 ETH", usdValue: "$95,940", change24h: -0.48 },
  { symbol: "SOL", name: "Solana", balance: "980 SOL", usdValue: "$146,510", change24h: 4.16 },
];

export const orders: Order[] = [
  {
    id: "ORD-84312",
    pair: "BTC/USDT",
    side: "Buy",
    amount: "0.42 BTC",
    price: "$68,120",
    status: "Partially Filled",
    createdAt: "2 mins ago",
  },
  {
    id: "ORD-84304",
    pair: "ETH/USDT",
    side: "Sell",
    amount: "4.80 ETH",
    price: "$3,018",
    status: "Open",
    createdAt: "14 mins ago",
  },
  {
    id: "ORD-84289",
    pair: "SOL/USDT",
    side: "Buy",
    amount: "220 SOL",
    price: "$149.5",
    status: "Filled",
    createdAt: "47 mins ago",
  },
];

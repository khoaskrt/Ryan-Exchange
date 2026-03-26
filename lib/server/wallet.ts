import { LedgerType, Prisma } from "@prisma/client";

const INITIAL_PAPER_BALANCES = [
  { asset: "USDT", amount: 100000 },
  { asset: "BTC", amount: 1 },
  { asset: "ETH", amount: 10 },
  { asset: "SOL", amount: 200 },
  { asset: "BNB", amount: 50 },
  { asset: "XRP", amount: 5000 },
];

export async function seedPaperWallet(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.walletBalance.findMany({
    where: { userId },
    select: { asset: true },
  });
  const existingAssets = new Set(existing.map((item) => item.asset));
  const missing = INITIAL_PAPER_BALANCES.filter((item) => !existingAssets.has(item.asset));

  if (missing.length > 0) {
    await tx.walletBalance.createMany({
      data: missing.map((item) => ({
        userId,
        asset: item.asset,
        available: new Prisma.Decimal(item.amount),
        locked: new Prisma.Decimal(0),
      })),
    });
  }

  await tx.ledgerEntry.createMany({
    data: INITIAL_PAPER_BALANCES.map((item) => ({
      userId,
      asset: item.asset,
      amount: new Prisma.Decimal(item.amount),
      entryType: LedgerType.PAPER_CREDIT,
      note: "Initial paper trading allocation",
    })),
  });
}

export async function ensureBalanceRow(tx: Prisma.TransactionClient, userId: string, asset: string) {
  const existing = await tx.walletBalance.findUnique({
    where: { userId_asset: { userId, asset } },
  });

  if (existing) return existing;

  return tx.walletBalance.create({
    data: {
      userId,
      asset,
      available: new Prisma.Decimal(0),
      locked: new Prisma.Decimal(0),
    },
  });
}

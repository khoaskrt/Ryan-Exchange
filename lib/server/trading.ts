import { LedgerType, OrderSide, OrderStatus, OrderType, Prisma } from "@prisma/client";

import { getMarketBySymbol, getOrderBook, normalizeSymbol } from "@/lib/server/markets";
import { prisma } from "@/lib/server/prisma";
import { ensureBalanceRow } from "@/lib/server/wallet";

type Fill = {
  price: number;
  quantity: number;
  notional: number;
};

type PlaceOrderInput = {
  userId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
};

type LedgerWriteInput = {
  userId: string;
  asset: string;
  amount: number;
  entryType: LedgerType;
  referenceId: string;
  note: string;
};

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(12));
}

function decimalToNumber(value: Prisma.Decimal | number | null) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function round(value: number, digits = 8) {
  return Number(value.toFixed(digits));
}

function splitSymbol(symbol: string) {
  const [baseAsset, quoteAsset] = symbol.split("/");
  if (!baseAsset || !quoteAsset) {
    throw new Error("INVALID_SYMBOL");
  }
  return { baseAsset, quoteAsset };
}

function simulateFills(params: { symbol: string; side: OrderSide; quantity: number; limitPrice?: number }) {
  const book = getOrderBook(params.symbol);
  if (!book) {
    return { fills: [], filledQty: 0, notional: 0, avgPrice: 0 };
  }

  const levels = params.side === OrderSide.BUY ? book.asks : book.bids;
  let remaining = params.quantity;
  const fills: Fill[] = [];

  for (const level of levels) {
    if (remaining <= 0) break;

    if (params.limitPrice != null) {
      if (params.side === OrderSide.BUY && level.price > params.limitPrice) break;
      if (params.side === OrderSide.SELL && level.price < params.limitPrice) break;
    }

    const quantity = Math.min(remaining, level.quantity);
    if (quantity <= 0) continue;

    fills.push({
      price: level.price,
      quantity,
      notional: round(level.price * quantity, 8),
    });
    remaining -= quantity;
  }

  const filledQty = round(fills.reduce((acc, fill) => acc + fill.quantity, 0), 8);
  const notional = round(fills.reduce((acc, fill) => acc + fill.notional, 0), 8);
  const avgPrice = filledQty > 0 ? round(notional / filledQty, 8) : 0;

  return { fills, filledQty, notional, avgPrice };
}

function estimateLockNotional(input: PlaceOrderInput) {
  if (input.orderType === OrderType.LIMIT) {
    if (!input.price || input.price <= 0) throw new Error("INVALID_PRICE");
    return round(input.quantity * input.price, 8);
  }

  const simulated = simulateFills({
    symbol: input.symbol,
    side: input.side,
    quantity: input.quantity,
  });

  if (simulated.filledQty <= 0) {
    throw new Error("NO_LIQUIDITY");
  }

  return simulated.notional;
}

function mapStatus(filledQty: number, quantity: number) {
  if (filledQty <= 0) return OrderStatus.NEW;
  if (filledQty >= quantity) return OrderStatus.FILLED;
  return OrderStatus.PARTIALLY_FILLED;
}

async function createLedgerEntryIfMissing(tx: Prisma.TransactionClient, input: LedgerWriteInput) {
  const existing = await tx.ledgerEntry.findFirst({
    where: {
      userId: input.userId,
      referenceId: input.referenceId,
      entryType: input.entryType,
      note: input.note,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      asset: input.asset,
      amount: toDecimal(input.amount),
      entryType: input.entryType,
      referenceId: input.referenceId,
      note: input.note,
    },
  });
}

export async function placePaperOrder(input: PlaceOrderInput) {
  const symbol = normalizeSymbol(input.symbol);
  const market = getMarketBySymbol(symbol);
  if (!market) {
    throw new Error("INVALID_SYMBOL");
  }

  if (input.quantity <= 0) throw new Error("INVALID_QUANTITY");
  if (input.orderType === OrderType.LIMIT && (!input.price || input.price <= 0)) {
    throw new Error("INVALID_PRICE");
  }

  return prisma.$transaction(async (tx) => {
    const { baseAsset, quoteAsset } = splitSymbol(symbol);
    const baseBalance = await ensureBalanceRow(tx, input.userId, baseAsset);
    const quoteBalance = await ensureBalanceRow(tx, input.userId, quoteAsset);
    const simulation = simulateFills({
      symbol,
      side: input.side,
      quantity: input.quantity,
      limitPrice: input.orderType === OrderType.LIMIT ? input.price : undefined,
    });
    const orderStatus = mapStatus(simulation.filledQty, input.quantity);

    const order = await tx.order.create({
      data: {
        userId: input.userId,
        symbol,
        side: input.side,
        orderType: input.orderType,
        price: input.price ? toDecimal(input.price) : null,
        quantity: toDecimal(input.quantity),
        filledQty: toDecimal(simulation.filledQty),
        avgFillPrice: simulation.avgPrice > 0 ? toDecimal(simulation.avgPrice) : null,
        status: orderStatus,
      },
    });

    let lockedBase = 0;
    let lockedQuote = 0;

    if (input.side === OrderSide.SELL) {
      if (decimalToNumber(baseBalance.available) < input.quantity) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      lockedBase = input.quantity;
      await tx.walletBalance.update({
        where: { userId_asset: { userId: input.userId, asset: baseAsset } },
        data: {
          available: { decrement: toDecimal(lockedBase) },
          locked: { increment: toDecimal(lockedBase) },
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: input.userId,
          asset: baseAsset,
          amount: toDecimal(-lockedBase),
          entryType: LedgerType.ORDER_LOCK,
          referenceId: order.id,
          note: `ORDER:${order.id}:LOCK:${baseAsset}`,
        },
      });
    } else {
      const notionalToLock = estimateLockNotional({ ...input, symbol });
      if (decimalToNumber(quoteBalance.available) < notionalToLock) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      lockedQuote = notionalToLock;
      await tx.walletBalance.update({
        where: { userId_asset: { userId: input.userId, asset: quoteAsset } },
        data: {
          available: { decrement: toDecimal(lockedQuote) },
          locked: { increment: toDecimal(lockedQuote) },
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: input.userId,
          asset: quoteAsset,
          amount: toDecimal(-lockedQuote),
          entryType: LedgerType.ORDER_LOCK,
          referenceId: order.id,
          note: `ORDER:${order.id}:LOCK:${quoteAsset}`,
        },
      });
    }

    if (simulation.filledQty > 0) {
      await tx.trade.createMany({
        data: simulation.fills.map((fill) => ({
          orderId: order.id,
          userId: input.userId,
          symbol,
          side: input.side,
          price: toDecimal(fill.price),
          quantity: toDecimal(fill.quantity),
          notional: toDecimal(fill.notional),
        })),
      });
    }

    const filledNotional = simulation.notional;
    const filledQty = simulation.filledQty;

    if (input.side === OrderSide.BUY) {
      if (filledQty > 0) {
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: quoteAsset } },
          data: {
            locked: { decrement: toDecimal(filledNotional) },
          },
        });
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: baseAsset } },
          data: {
            available: { increment: toDecimal(filledQty) },
          },
        });

        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: quoteAsset,
          amount: -filledNotional,
          entryType: LedgerType.ORDER_FILL,
          referenceId: order.id,
          note: `ORDER:${order.id}:SETTLE:BUY:DEBIT:${quoteAsset}`,
        });
        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: baseAsset,
          amount: filledQty,
          entryType: LedgerType.ORDER_FILL,
          referenceId: order.id,
          note: `ORDER:${order.id}:SETTLE:BUY:CREDIT:${baseAsset}`,
        });
      }

      const remainingLock = round(lockedQuote - filledNotional, 8);
      if (remainingLock > 0 && orderStatus !== OrderStatus.NEW && input.orderType === OrderType.MARKET) {
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: quoteAsset } },
          data: {
            available: { increment: toDecimal(remainingLock) },
            locked: { decrement: toDecimal(remainingLock) },
          },
        });
        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: quoteAsset,
          amount: remainingLock,
          entryType: LedgerType.ORDER_UNLOCK,
          referenceId: order.id,
          note: `ORDER:${order.id}:UNLOCK:QUOTE:MARKET_REMAINDER`,
        });
      }
    } else {
      if (filledQty > 0) {
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: baseAsset } },
          data: {
            locked: { decrement: toDecimal(filledQty) },
          },
        });
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: quoteAsset } },
          data: {
            available: { increment: toDecimal(filledNotional) },
          },
        });

        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: baseAsset,
          amount: -filledQty,
          entryType: LedgerType.ORDER_FILL,
          referenceId: order.id,
          note: `ORDER:${order.id}:SETTLE:SELL:DEBIT:${baseAsset}`,
        });
        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: quoteAsset,
          amount: filledNotional,
          entryType: LedgerType.ORDER_FILL,
          referenceId: order.id,
          note: `ORDER:${order.id}:SETTLE:SELL:CREDIT:${quoteAsset}`,
        });
      }

      const remainingBase = round(lockedBase - filledQty, 8);
      if (remainingBase > 0 && orderStatus !== OrderStatus.NEW && input.orderType === OrderType.MARKET) {
        await tx.walletBalance.update({
          where: { userId_asset: { userId: input.userId, asset: baseAsset } },
          data: {
            available: { increment: toDecimal(remainingBase) },
            locked: { decrement: toDecimal(remainingBase) },
          },
        });
        await createLedgerEntryIfMissing(tx, {
          userId: input.userId,
          asset: baseAsset,
          amount: remainingBase,
          entryType: LedgerType.ORDER_UNLOCK,
          referenceId: order.id,
          note: `ORDER:${order.id}:UNLOCK:BASE:MARKET_REMAINDER`,
        });
      }
    }

    if (filledQty > 0) {
      await tx.user.updateMany({
        where: { id: input.userId, firstTradeAt: null },
        data: { firstTradeAt: new Date() },
      });
    }

    const fresh = await tx.order.findUnique({
      where: { id: order.id },
      include: { trades: true },
    });
    return fresh;
  });
}

export async function cancelPaperOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { trades: { select: { notional: true } } },
    });
    if (!order || order.userId !== userId) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED || order.status === OrderStatus.REJECTED) {
      throw new Error("ORDER_NOT_CANCELABLE");
    }

    const transition = await tx.order.updateMany({
      where: {
        id: order.id,
        userId,
        status: { in: [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED] },
      },
      data: {
        status: OrderStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    if (transition.count === 0) {
      throw new Error("ORDER_NOT_CANCELABLE");
    }

    const quantity = decimalToNumber(order.quantity);
    const filledQty = decimalToNumber(order.filledQty);
    const remainingQty = round(quantity - filledQty, 8);
    if (remainingQty <= 0) {
      return tx.order.findUniqueOrThrow({ where: { id: order.id } });
    }

    const { baseAsset, quoteAsset } = splitSymbol(order.symbol);
    if (order.side === OrderSide.SELL) {
      await tx.walletBalance.update({
        where: { userId_asset: { userId, asset: baseAsset } },
        data: {
          available: { increment: toDecimal(remainingQty) },
          locked: { decrement: toDecimal(remainingQty) },
        },
      });
      await createLedgerEntryIfMissing(tx, {
        userId,
        asset: baseAsset,
        amount: remainingQty,
        entryType: LedgerType.ORDER_UNLOCK,
        referenceId: order.id,
        note: `ORDER:${order.id}:UNLOCK:BASE:CANCEL`,
      });
    } else {
      const limitPrice = decimalToNumber(order.price);
      const filledNotional = round(
        order.trades.reduce((sum, trade) => sum + decimalToNumber(trade.notional), 0),
        8,
      );
      const initialLockNotional =
        order.orderType === OrderType.LIMIT ? round(quantity * limitPrice, 8) : filledNotional;
      const alreadyUnlockedDuringSettle =
        order.orderType === OrderType.MARKET ? round(initialLockNotional - filledNotional, 8) : 0;
      const remainingNotional = round(initialLockNotional - filledNotional - alreadyUnlockedDuringSettle, 8);

      if (remainingNotional > 0) {
        await tx.walletBalance.update({
          where: { userId_asset: { userId, asset: quoteAsset } },
          data: {
            available: { increment: toDecimal(remainingNotional) },
            locked: { decrement: toDecimal(remainingNotional) },
          },
        });
        await createLedgerEntryIfMissing(tx, {
          userId,
          asset: quoteAsset,
          amount: remainingNotional,
          entryType: LedgerType.ORDER_UNLOCK,
          referenceId: order.id,
          note: `ORDER:${order.id}:UNLOCK:QUOTE:CANCEL`,
        });
      }
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
    });
  });
}

import { OrderSide, OrderType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";
import { getAuthenticatedUser } from "@/lib/server/session";
import { placePaperOrder } from "@/lib/server/trading";
import { createOrderSchema } from "@/lib/server/validators";

function numberFromDecimal(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toString" in value) {
    return Number((value as { toString: () => string }).toString());
  }
  return Number(value);
}

function serializeOrder(order: Awaited<ReturnType<typeof placePaperOrder>>) {
  if (!order) return null;
  return {
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    orderType: order.orderType,
    price: numberFromDecimal(order.price),
    quantity: numberFromDecimal(order.quantity),
    filledQty: numberFromDecimal(order.filledQty),
    avgFillPrice: numberFromDecimal(order.avgFillPrice),
    status: order.status,
    createdAt: order.createdAt,
    canceledAt: order.canceledAt,
    trades: order.trades.map((trade) => ({
      id: trade.id,
      price: numberFromDecimal(trade.price),
      quantity: numberFromDecimal(trade.quantity),
      notional: numberFromDecimal(trade.notional),
      createdAt: trade.createdAt,
    })),
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { trades: true },
    take: 100,
  });

  return NextResponse.json(
    {
      orders: orders.map((order) =>
        serializeOrder({
          ...order,
          trades: order.trades,
        }),
      ),
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse({
      ...body,
      quantity: Number(body?.quantity),
      price: body?.price != null ? Number(body.price) : undefined,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request payload.";
      return NextResponse.json({ message }, { status: 400 });
    }

    const order = await placePaperOrder({
      userId: user.id,
      symbol: parsed.data.symbol,
      side: parsed.data.side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
      orderType: parsed.data.orderType === "MARKET" ? OrderType.MARKET : OrderType.LIMIT,
      quantity: parsed.data.quantity,
      price: parsed.data.price,
    });

    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_SYMBOL") {
        return NextResponse.json({ message: "Market symbol not supported." }, { status: 400 });
      }
      if (error.message === "INVALID_QUANTITY" || error.message === "INVALID_PRICE") {
        return NextResponse.json({ message: "Invalid order parameters." }, { status: 400 });
      }
      if (error.message === "NO_LIQUIDITY") {
        return NextResponse.json({ message: "No liquidity available for this order." }, { status: 409 });
      }
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ message: "Insufficient balance." }, { status: 409 });
      }
    }

    console.error("Create order error", error);
    return NextResponse.json({ message: "Unable to place order right now." }, { status: 500 });
  }
}

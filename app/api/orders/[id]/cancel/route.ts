import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/server/session";
import { cancelPaperOrder } from "@/lib/server/trading";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const order = await cancelPaperOrder(user.id, id);

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          canceledAt: order.canceledAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return NextResponse.json({ message: "Order not found." }, { status: 404 });
      }
      if (error.message === "ORDER_NOT_CANCELABLE") {
        return NextResponse.json({ message: "Order is not cancelable." }, { status: 409 });
      }
    }

    console.error("Cancel order error", error);
    return NextResponse.json({ message: "Unable to cancel order right now." }, { status: 500 });
  }
}

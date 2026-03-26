import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { emitWalletDepositUpdateToUser } from "@/lib/server/realtime";
import { type WalletDepositSocketEvent } from "@/lib/socket/events";

const emitSchema = z.object({
  userId: z.string().min(1),
  txId: z.string().min(1),
  assetCode: z.string().min(1),
  networkCode: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
  txHash: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const internalSecret = process.env.INTERNAL_SOCKET_SECRET;
  if (!internalSecret) {
    return NextResponse.json(
      { message: "INTERNAL_SOCKET_SECRET is not configured." },
      { status: 500 },
    );
  }

  const providedSecret = request.headers.get("x-internal-secret");
  if (providedSecret !== internalSecret) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = emitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const payload: WalletDepositSocketEvent = {
    txId: parsed.data.txId,
    assetCode: parsed.data.assetCode,
    networkCode: parsed.data.networkCode,
    amount: parsed.data.amount,
    status: parsed.data.status,
    txHash: parsed.data.txHash,
    occurredAt: parsed.data.occurredAt ?? new Date().toISOString(),
  };

  const emitted = emitWalletDepositUpdateToUser(parsed.data.userId, payload);

  if (!emitted) {
    return NextResponse.json(
      { message: "Socket server is not available." },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

import { NextResponse } from "next/server";

import { redeemInviteForEmail } from "@/lib/server/invite";
import { inviteRedeemSchema } from "@/lib/server/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = inviteRedeemSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request payload.";
      return NextResponse.json({ message }, { status: 400 });
    }

    const result = await redeemInviteForEmail(parsed.data.email, parsed.data.code);
    return NextResponse.json(
      {
        ok: true,
        inviteCode: result.inviteCode,
        alreadyRedeemed: result.alreadyRedeemed,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITE") {
      return NextResponse.json({ message: "Invite code is invalid or expired." }, { status: 400 });
    }

    console.error("Invite redeem error", error);
    return NextResponse.json({ message: "Unable to redeem invite code right now." }, { status: 500 });
  }
}

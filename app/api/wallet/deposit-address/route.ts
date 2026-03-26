import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/server/session";
import {
  SUPPORTED_WALLET_ASSET,
  SUPPORTED_WALLET_NETWORKS,
  getOrCreateDepositAddress,
  isSupportedWalletNetwork,
} from "@/lib/server/wallet-mvp";

const requestSchema = z.object({
  assetCode: z.string().trim().min(1),
  networkCode: z.string().trim().min(1),
});

function warningByNetwork(networkCode: string) {
  if (networkCode === "BEP20_BSC") {
    return "Chi gui USDT qua mang BNB Smart Chain (BEP-20) den dia chi nay.";
  }
  return "Chi gui USDT qua mang Polygon den dia chi nay.";
}

function validateAssetAndNetwork(assetCode: string, networkCode: string) {
  if (assetCode !== SUPPORTED_WALLET_ASSET) {
    return "Only USDT is supported in MVP.";
  }
  if (!isSupportedWalletNetwork(networkCode)) {
    return "Unsupported networkCode. Allowed: BEP20_BSC, POLYGON_POS.";
  }
  return null;
}

async function resolvePayload(request: NextRequest) {
  if (request.method === "GET") {
    return {
      assetCode: request.nextUrl.searchParams.get("assetCode") ?? "",
      networkCode: request.nextUrl.searchParams.get("networkCode") ?? "",
    };
  }
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data;
}

async function handleGetOrCreate(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const payload = await resolvePayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const validationError = validateAssetAndNetwork(payload.assetCode, payload.networkCode);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const depositAddress = await getOrCreateDepositAddress({
    userId: user.id,
    assetCode: payload.assetCode,
    // `validateAssetAndNetwork` đã xác nhận networkCode nằm trong union hợp lệ.
    networkCode: payload.networkCode as (typeof SUPPORTED_WALLET_NETWORKS)[number],
  });

  return NextResponse.json(
    {
      assetCode: payload.assetCode,
      networkCode: payload.networkCode,
      address: depositAddress.address,
      memo: depositAddress.tagMemo,
      warningNote: warningByNetwork(payload.networkCode),
    },
    { status: 200 },
  );
}

export async function GET(request: NextRequest) {
  return handleGetOrCreate(request);
}

export async function POST(request: NextRequest) {
  return handleGetOrCreate(request);
}

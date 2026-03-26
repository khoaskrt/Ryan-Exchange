import { cookies } from "next/headers";

import { MarketsPage } from "@/features/markets/components/markets-page";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";

function buildUidFromSub(sub: string) {
  let hash = 0;
  for (let i = 0; i < sub.length; i += 1) {
    hash = (hash * 31 + sub.charCodeAt(i)) % 1_000_000_000;
  }

  return `${Math.abs(hash)}`.padStart(9, "0");
}

export default async function MarketsRoutePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  let user: { email: string; uid: string } | null = null;

  if (token) {
    try {
      const payload = await verifySessionToken(token);
      user = { email: payload.email, uid: buildUidFromSub(payload.sub) };
    } catch {
      user = null;
    }
  }

  return <MarketsPage user={user} />;
}

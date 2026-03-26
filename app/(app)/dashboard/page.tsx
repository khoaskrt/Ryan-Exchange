import { cookies } from "next/headers";

import { WalletDashboard } from "@/features/wallet/components/wallet-dashboard";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  let userName = "Trader";

  if (token) {
    try {
      const payload = await verifySessionToken(token);
      userName = payload.name;
    } catch {
      userName = "Trader";
    }
  }

  return <WalletDashboard userName={userName} />;
}

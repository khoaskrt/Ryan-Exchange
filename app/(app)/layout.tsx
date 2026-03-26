import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    await verifySessionToken(token);
    return children;
  } catch {
    redirect("/login");
  }
}

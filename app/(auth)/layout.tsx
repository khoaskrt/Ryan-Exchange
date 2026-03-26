import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/auth";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return children;
  }

  try {
    await verifySessionToken(token);
    redirect("/dashboard");
  } catch {
    return children;
  }
}

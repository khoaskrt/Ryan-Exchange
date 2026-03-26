import Link from "next/link";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in with your email and password to access your dashboard."
      footer={
        <p>
          New to Ryan Exchange?{" "}
          <Link href="/signup" className="font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:decoration-black">
            Create account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}

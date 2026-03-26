import Link from "next/link";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupStepCountry } from "@/components/auth/SignupStepCountry";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Step 1: select your country before account registration."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:decoration-black">
            Sign in
          </Link>
        </p>
      }
    >
      <SignupStepCountry />
    </AuthLayout>
  );
}

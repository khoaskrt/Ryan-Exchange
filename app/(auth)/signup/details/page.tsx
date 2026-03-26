import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupStepForm } from "@/components/auth/SignupStepForm";

export default function SignupDetailsPage() {
  return (
    <AuthLayout title="Create your account" subtitle="Step 2: complete your registration details.">
      <SignupStepForm />
    </AuthLayout>
  );
}

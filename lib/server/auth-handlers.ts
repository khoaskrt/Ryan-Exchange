import { loginController, signupController } from "@/lib/server/auth/auth.controller";

export async function handleSignup(request: Request) {
  return signupController(request);
}

export async function handleLogin(request: Request) {
  return loginController(request);
}

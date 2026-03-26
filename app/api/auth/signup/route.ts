import { signupController } from "@/lib/server/auth/auth.controller";

export async function POST(request: Request) {
  return signupController(request);
}

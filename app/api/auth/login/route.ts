import { loginController } from "@/lib/server/auth/auth.controller";

export async function POST(request: Request) {
  return loginController(request);
}

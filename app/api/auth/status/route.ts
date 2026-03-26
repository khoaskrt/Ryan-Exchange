import { authStatusController } from "@/lib/server/auth/auth.controller";

export async function GET(request: Request) {
  return authStatusController(request);
}

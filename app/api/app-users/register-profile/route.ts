import { registerProfileController } from "@/lib/server/auth/auth.controller";

export async function POST(request: Request) {
  return registerProfileController(request);
}

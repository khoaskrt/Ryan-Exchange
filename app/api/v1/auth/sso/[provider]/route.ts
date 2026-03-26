import { ssoUnavailableController } from "@/lib/server/auth/auth.controller";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { provider } = await context.params;
  return ssoUnavailableController(provider);
}

export async function POST(_request: Request, context: RouteContext) {
  const { provider } = await context.params;
  return ssoUnavailableController(provider);
}

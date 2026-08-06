type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: Request, context: RouteContext) {
  if (process.env.DEMO_MODE === "true") return Response.json({ error: "Neon Auth is disabled in demo mode" }, { status: 404 });
  const { neonAuth } = await import("@/server/auth/neon");
  const methods = neonAuth.handler();
  return request.method === "GET" ? methods.GET(request, context) : methods.POST(request, context);
}

export const GET = handler;
export const POST = handler;

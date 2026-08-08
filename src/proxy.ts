import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/features/auth/server/neon-auth";

const neonAuthMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  // Neon Auth 0.4.2-beta forwards the original POST method when it checks a
  // session for a Server Action, but its get-session endpoint expects GET.
  // Mutations perform their secure authorization in the DAL/operation itself.
  if (request.headers.has("next-action")) return NextResponse.next();

  return neonAuthMiddleware(request);
}

export const config = {
  matcher: ["/", "/groups/:path*", "/profile/:path*"],
};

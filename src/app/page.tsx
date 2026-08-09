import { redirect } from "next/navigation";

import { getAuthenticatedHome } from "@/features/auth/domain/models";
import { requireAppRouteContext } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await requireAppRouteContext();
  redirect(getAuthenticatedHome(context.memberships));
}

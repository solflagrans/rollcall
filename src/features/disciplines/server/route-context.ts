import "server-only";

import { redirect } from "next/navigation";

import { requireManagerRouteAccess } from "@/features/auth/server/route-context";
import { getGroupDisciplinesContext } from "@/features/disciplines/server/operations";

export async function requireDisciplinesRouteContext(groupReference: string) {
  await requireManagerRouteAccess(groupReference);
  const context = await getGroupDisciplinesContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  return context;
}

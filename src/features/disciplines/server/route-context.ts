import "server-only";

import { redirect } from "next/navigation";

import { getGroupDisciplinesContext } from "@/features/disciplines/server/operations";

export async function requireDisciplinesRouteContext(groupReference: string) {
  const context = await getGroupDisciplinesContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  return context;
}

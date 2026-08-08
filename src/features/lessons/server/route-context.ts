import "server-only";

import { redirect } from "next/navigation";

import { getLessonCreationContext } from "@/features/lessons/server/operations";

export async function requireLessonCreationRouteContext(
  groupReference: string,
  periodReference: string,
) {
  const context = await getLessonCreationContext(groupReference, periodReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.period) {
    redirect(`/groups/${context.group.publicId}?notice=period-not-found`);
  }
  return { ...context, period: context.period };
}

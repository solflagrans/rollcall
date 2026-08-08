import "server-only";

import { redirect } from "next/navigation";

import {
  getLessonContext,
  getLessonCreationContext,
} from "@/features/lessons/server/operations";

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

export async function requireLessonRouteContext(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
) {
  const context = await getLessonContext(
    groupReference,
    periodReference,
    lessonReference,
  );
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.period) {
    redirect(`/groups/${context.group.publicId}?notice=period-not-found`);
  }
  if (!context.lesson) {
    redirect(
      `/groups/${context.group.publicId}/periods/${context.period.publicId}?notice=lesson-not-found`,
    );
  }
  return { ...context, period: context.period, lesson: context.lesson };
}

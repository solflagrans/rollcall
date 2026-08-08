import "server-only";

import { cache } from "react";

import type {
  CreateLessonInput,
  UpdateLessonAttendanceInput,
  UpdateLessonInput,
} from "@/features/lessons/schemas";
import { DrizzleLessonsRepository } from "@/features/lessons/server/drizzle-repository";
import { LessonsService } from "@/features/lessons/server/service";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

let service: LessonsService | undefined;

function getService() {
  service ??= new LessonsService(new DrizzleLessonsRepository());
  return service;
}

export const getLessonCreationContext = cache(
  (groupReference: string, periodReference: string) =>
    getService().getCreationContext(groupReference, periodReference),
);

export const getPeriodJournal = cache(
  (groupId: string, periodId: string) =>
    getService().getJournal(groupId, periodId),
);

export const getLessonContext = cache(
  (
    groupReference: string,
    periodReference: string,
    lessonReference: string,
  ) =>
    getService().getLessonContext(
      groupReference,
      periodReference,
      lessonReference,
    ),
);

export function createLesson(
  groupReference: string,
  periodReference: string,
  input: CreateLessonInput,
) {
  return getService().createLesson(groupReference, periodReference, input);
}

export async function updateLessonAttendance(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
  input: UpdateLessonAttendanceInput,
) {
  return getService().updateLessonAttendance(
    groupReference,
    periodReference,
    lessonReference,
    input,
    await getUserToday(),
  );
}

export async function updateLesson(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
  input: UpdateLessonInput,
) {
  return getService().updateLesson(
    groupReference,
    periodReference,
    lessonReference,
    input,
    await getUserToday(),
  );
}

export async function deleteLesson(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
) {
  return getService().deleteLesson(
    groupReference,
    periodReference,
    lessonReference,
    await getUserToday(),
  );
}

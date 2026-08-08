import "server-only";

import { cache } from "react";

import { requireManagerMembership } from "@/features/auth/server/authorization";
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
  async (groupReference: string, periodReference: string) => {
    await requireManagerMembership(groupReference);
    return getService().getCreationContext(groupReference, periodReference);
  },
);

export const getPeriodJournal = cache(
  async (groupId: string, periodId: string) => {
    await requireManagerMembership(groupId);
    return getService().getJournal(groupId, periodId);
  },
);

export const getCompletedMemberAttendance = cache(
  (periodId: string, memberId: string) =>
    getService().getCompletedMemberAttendance(periodId, memberId),
);

export const getMemberAttendancePeriodIds = cache((memberId: string) =>
  getService().getMemberAttendancePeriodIds(memberId),
);

export const getLessonContext = cache(
  async (
    groupReference: string,
    periodReference: string,
    lessonReference: string,
  ) => {
    await requireManagerMembership(groupReference);
    return getService().getLessonContext(
      groupReference,
      periodReference,
      lessonReference,
    );
  },
);

export async function createLesson(
  groupReference: string,
  periodReference: string,
  input: CreateLessonInput,
) {
  await requireManagerMembership(groupReference);
  return getService().createLesson(groupReference, periodReference, input);
}

export async function updateLessonAttendance(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
  input: UpdateLessonAttendanceInput,
) {
  await requireManagerMembership(groupReference);
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
  await requireManagerMembership(groupReference);
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
  await requireManagerMembership(groupReference);
  return getService().deleteLesson(
    groupReference,
    periodReference,
    lessonReference,
    await getUserToday(),
  );
}

import "server-only";

import { cache } from "react";

import type { CreateLessonInput } from "@/features/lessons/schemas";
import { DrizzleLessonsRepository } from "@/features/lessons/server/drizzle-repository";
import { LessonsService } from "@/features/lessons/server/service";

let service: LessonsService | undefined;

function getService() {
  service ??= new LessonsService(new DrizzleLessonsRepository());
  return service;
}

export function getLessonsCacheTag(periodReference: string): string {
  return `period-lessons:${periodReference}`;
}

export const getLessonCreationContext = cache(
  (groupReference: string, periodReference: string) =>
    getService().getCreationContext(groupReference, periodReference),
);

export function createLesson(
  groupReference: string,
  periodReference: string,
  input: CreateLessonInput,
) {
  return getService().createLesson(groupReference, periodReference, input);
}

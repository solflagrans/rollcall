import { z } from "zod";

import {
  attendanceStatuses,
  lessonTypes,
} from "@/features/lessons/domain/lessons";
import { entityReferenceSchema } from "@/features/groups/schemas";
import { isCalendarDate } from "@/lib/calendar-date";

const lessonDateSchema = z
  .string()
  .min(1, "Укажите дату занятия.")
  .refine(isCalendarDate, "Укажите корректную дату занятия.");

const attendanceCommentSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() || null)
  .pipe(
    z
      .string()
      .max(500, "Комментарий должен быть не длиннее 500 символов.")
      .nullable(),
  );

export const lessonDetailsSchema = z.object({
    lessonDate: lessonDateSchema,
    disciplineId: entityReferenceSchema,
    lessonType: z.enum(lessonTypes, { error: "Выберите тип занятия." }),
});

export const lessonFormSchema = lessonDetailsSchema
  .extend({
    attendance: z
      .array(
        z.object({
          groupMemberId: entityReferenceSchema,
          status: z.enum(attendanceStatuses).nullable(),
          comment: attendanceCommentSchema,
        }),
      )
      .max(500, "В одном занятии может быть не более 500 участников."),
  })
  .superRefine(({ attendance }, context) => {
    const seen = new Set<string>();
    attendance.forEach((entry, index) => {
      if (seen.has(entry.groupMemberId)) {
        context.addIssue({
          code: "custom",
          path: ["attendance", index, "groupMemberId"],
          message: "Участник не должен повторяться в посещаемости.",
        });
      }
      seen.add(entry.groupMemberId);
    });
  });

export type LessonFormValues = z.input<typeof lessonFormSchema>;
export type NormalizedLessonFormValues = z.output<typeof lessonFormSchema>;
export type LessonDetailsFormValues = z.input<typeof lessonDetailsSchema>;
export type CreateLessonInput = LessonFormValues;

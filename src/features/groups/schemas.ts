import { z } from "zod";

import { normalizeGroupName } from "@/features/groups/domain/group";
import { periodTypes } from "@/features/groups/domain/periods";
import { isCalendarDate } from "@/lib/calendar-date";

const normalizedGroupName = z
  .string()
  .transform(normalizeGroupName)
  .pipe(
    z
      .string()
      .min(1, "Введите название группы.")
      .max(80, "Название группы должно быть не длиннее 80 символов."),
  );

const periodNumber = z
  .number({ error: "Введите номер." })
  .int("Номер должен быть целым числом.")
  .min(1, "Номер должен быть не меньше 1.")
  .max(99, "Номер должен быть не больше 99.");

const calendarDate = z
  .string()
  .min(1, "Укажите дату.")
  .refine(isCalendarDate, "Укажите корректную дату.");

const periodFields = {
  number: periodNumber,
  startsOn: calendarDate,
  endsOn: calendarDate,
};

function validateDateRange(
  values: { startsOn: string; endsOn: string },
  context: z.RefinementCtx,
) {
  if (values.endsOn < values.startsOn) {
    context.addIssue({
      code: "custom",
      path: ["endsOn"],
      message: "Дата окончания не может быть раньше даты начала.",
    });
  }
}

export const createGroupSchema = z.object({
  name: normalizedGroupName,
  periodType: z.enum(periodTypes, { error: "Выберите тип учебных периодов." }),
});
export const updateGroupSchema = z.object({ name: normalizedGroupName });

export const academicPeriodFormSchema = z.object(periodFields).superRefine(validateDateRange);

export const createAcademicPeriodSchema = academicPeriodFormSchema;
export const updateAcademicPeriodSchema = createAcademicPeriodSchema;

export const entityIdSchema = z.uuid("Некорректный идентификатор.");
export const publicIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{12}$/u, "Некорректный публичный идентификатор.");
export const entityReferenceSchema = z.union([entityIdSchema, publicIdSchema]);

export type GroupFormValues = z.input<typeof createGroupSchema>;
export type AcademicPeriodFormValues = z.input<typeof academicPeriodFormSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type UpdateGroupInput = z.input<typeof updateGroupSchema>;
export type CreateAcademicPeriodInput = z.input<typeof createAcademicPeriodSchema>;
export type UpdateAcademicPeriodInput = z.input<typeof updateAcademicPeriodSchema>;

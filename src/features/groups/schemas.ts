import { z } from "zod";

import { normalizeGroupName } from "@/features/groups/domain/group";
import { periodTypes } from "@/features/groups/domain/periods";

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
  .number({ error: "Введите номер периода." })
  .int("Номер периода должен быть целым числом.")
  .min(1, "Номер периода должен быть не меньше 1.")
  .max(99, "Номер периода должен быть не больше 99.");

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

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

export const createGroupSchema = z.object({ name: normalizedGroupName });
export const updateGroupSchema = createGroupSchema;

export const firstAcademicPeriodFormSchema = z
  .object({
    periodType: z.enum(periodTypes, { error: "Выберите тип периодов." }),
    ...periodFields,
  })
  .superRefine(validateDateRange);

export const academicPeriodFormSchema = z.object(periodFields).superRefine(validateDateRange);

export const createFirstAcademicPeriodSchema = firstAcademicPeriodFormSchema.and(
  z.object({ forceOverlap: z.boolean().optional().default(false) }),
);
export const createAcademicPeriodSchema = academicPeriodFormSchema.and(
  z.object({ forceOverlap: z.boolean().optional().default(false) }),
);
export const updateAcademicPeriodSchema = createAcademicPeriodSchema;

export const entityIdSchema = z.uuid("Некорректный идентификатор.");

export type GroupFormValues = z.input<typeof createGroupSchema>;
export type FirstAcademicPeriodFormValues = z.input<typeof firstAcademicPeriodFormSchema>;
export type AcademicPeriodFormValues = z.input<typeof academicPeriodFormSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type UpdateGroupInput = z.input<typeof updateGroupSchema>;
export type CreateFirstAcademicPeriodInput = z.input<typeof createFirstAcademicPeriodSchema>;
export type CreateAcademicPeriodInput = z.input<typeof createAcademicPeriodSchema>;
export type UpdateAcademicPeriodInput = z.input<typeof updateAcademicPeriodSchema>;

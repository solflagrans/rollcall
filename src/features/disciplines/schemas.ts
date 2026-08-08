import { z } from "zod";

import { entityReferenceSchema } from "@/features/groups/schemas";

function normalizeDisciplineName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export const disciplineFormSchema = z.object({
  name: z
    .string()
    .transform(normalizeDisciplineName)
    .pipe(
      z
        .string()
        .min(1, "Введите название дисциплины.")
        .max(120, "Название должно быть не длиннее 120 символов."),
    ),
});

export const disciplineSelectionSchema = z.object({
  disciplineIds: z
    .array(entityReferenceSchema)
    .min(1, "Выберите хотя бы одну дисциплину.")
    .max(100, "За один раз можно добавить не более 100 дисциплин."),
});

export type DisciplineFormValues = z.input<typeof disciplineFormSchema>;
export type NormalizedDisciplineInput = z.output<typeof disciplineFormSchema>;
export type DisciplineSelectionInput = z.input<typeof disciplineSelectionSchema>;

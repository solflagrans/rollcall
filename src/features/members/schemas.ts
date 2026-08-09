import { z } from "zod";

import { editableGroupMemberRoles } from "@/features/members/domain/members";

function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

const personName = (label: "имя" | "фамилию") =>
  z
    .string()
    .transform(normalizePersonName)
    .pipe(
      z
        .string()
        .min(1, `Введите ${label}.`)
        .max(
          80,
          label === "имя"
            ? "Имя должно быть не длиннее 80 символов."
            : "Фамилия должна быть не длиннее 80 символов.",
        ),
    );

const memberFields = {
  lastName: personName("фамилию"),
  firstName: personName("имя"),
};

export const memberFormSchema = z.object({
  ...memberFields,
  role: z.enum(editableGroupMemberRoles, { error: "Выберите роль участника." }),
});

export type MemberFormValues = z.input<typeof memberFormSchema>;
export type MemberInput = z.input<typeof memberFormSchema>;
export type NormalizedMemberInput = z.output<typeof memberFormSchema>;

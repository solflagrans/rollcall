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

const optionalEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? "")
  .pipe(
    z
      .string()
      .max(320, "Email должен быть не длиннее 320 символов.")
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        "Введите корректный email.",
      ),
  )
  .transform((value) => (value === "" ? null : value.toLowerCase()));

const memberFields = {
  lastName: personName("фамилию"),
  firstName: personName("имя"),
  email: optionalEmail,
};

export const memberFormSchema = z.object({
  ...memberFields,
  role: z.enum(editableGroupMemberRoles, { error: "Выберите роль участника." }),
});

export type MemberFormValues = z.input<typeof memberFormSchema>;
export type MemberInput = z.input<typeof memberFormSchema>;
export type NormalizedMemberInput = z.output<typeof memberFormSchema>;

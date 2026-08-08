import { z } from "zod";

import {
  passwordSchema,
  personalNamesSchema,
} from "@/features/auth/schemas";

export const updatePersonalDataSchema = personalNamesSchema;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Повторите новый пароль."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают.",
  });

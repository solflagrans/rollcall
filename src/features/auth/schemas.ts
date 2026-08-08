import { z } from "zod";

const normalizeName = (value: string) => value.trim().replace(/\s+/gu, " ");

const nameField = (label: "имя" | "фамилию") =>
  z
    .string()
    .transform(normalizeName)
    .pipe(
      z
        .string()
        .min(1, `Введите ${label}.`)
        .max(80, `${label === "имя" ? "Имя" : "Фамилия"} должна быть не длиннее 80 символов.`),
    );

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Введите корректный email.").max(256, "Email слишком длинный."));

export const passwordSchema = z
  .string()
  .min(8, "Пароль должен содержать не менее 8 символов.")
  .max(128, "Пароль должен содержать не более 128 символов.")
  .regex(/[\p{L}]/u, "Добавьте в пароль хотя бы одну букву.")
  .regex(/\d/u, "Добавьте в пароль хотя бы одну цифру.");

export const personalNamesSchema = z.object({
  firstName: nameField("имя"),
  lastName: nameField("фамилию"),
});

export const signUpSchema = personalNamesSchema.extend({
  email: emailField,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Введите пароль."),
});

export const verificationSchema = z.object({
  email: emailField,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/u, "Введите код из письма."),
});

export const emailOnlySchema = z.object({ email: emailField });

export const resetPasswordSchema = z.object({
  email: emailField,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/u, "Введите код из письма."),
  password: passwordSchema,
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type VerificationInput = z.input<typeof verificationSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

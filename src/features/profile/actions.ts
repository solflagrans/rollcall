"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getAuthorizationErrorMessage } from "@/features/auth/server/authorization";
import {
  requireAuthUser,
  updateCurrentAuthProfile,
} from "@/features/auth/server/authorization";
import { auth } from "@/features/auth/server/neon-auth";
import {
  changePasswordSchema,
  updatePersonalDataSchema,
} from "@/features/profile/schemas";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

export type ProfileActionResult =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      formError: string;
      fieldErrors?: Record<string, string>;
    };

function authErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return `${code} ${message}`.toUpperCase();
}

function validationError(
  error: ZodError,
  fields: ReadonlySet<string>,
): ProfileActionResult {
  return {
    status: "error",
    formError: "Проверьте заполненные поля.",
    fieldErrors: getZodFieldErrors(error, fields),
  };
}

function operationError(scope: string, error: unknown): ProfileActionResult {
  const authorizationMessage = getAuthorizationErrorMessage(error);
  if (authorizationMessage) {
    return { status: "error", formError: authorizationMessage };
  }
  logUnexpectedOperationError(`profile.${scope}`, error);
  return {
    status: "error",
    formError: "Не удалось сохранить изменения. Повторите попытку.",
  };
}

export async function updatePersonalDataAction(
  _state: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  try {
    const values = updatePersonalDataSchema.parse(Object.fromEntries(formData));
    await updateCurrentAuthProfile(values);
    revalidatePath("/", "layout");
    return { status: "success", message: "Личные данные обновлены." };
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error, new Set(["firstName", "lastName"]));
    }
    return operationError("personal-data", error);
  }
}

export async function changePasswordAction(
  _state: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  try {
    await requireAuthUser();
    const values = changePasswordSchema.parse(Object.fromEntries(formData));
    const { error } = await auth.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: false,
    });
    if (error) {
      const code = authErrorCode(error);
      if (code.includes("INVALID_PASSWORD") || code.includes("INVALID PASSWORD")) {
        return {
          status: "error",
          formError: "Текущий пароль указан неверно.",
          fieldErrors: { currentPassword: "Неверный текущий пароль." },
        };
      }
      if (code.includes("CREDENTIAL_ACCOUNT_NOT_FOUND")) {
        return {
          status: "error",
          formError: "Для этого аккаунта не настроен вход по паролю.",
        };
      }
      throw error;
    }
    return { status: "success", message: "Пароль успешно изменён." };
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(
        error,
        new Set(["currentPassword", "newPassword", "confirmPassword"]),
      );
    }
    return operationError("password", error);
  }
}

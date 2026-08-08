"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getMembershipHome } from "@/features/auth/domain/models";
import {
  emailOnlySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verificationSchema,
} from "@/features/auth/schemas";
import {
  requireGroupMembership,
  saveAuthProfile,
} from "@/features/auth/server/authorization";
import {
  auth,
  resetPasswordWithEmailOtp,
} from "@/features/auth/server/neon-auth";
import {
  consumePendingAuthProfile,
  setPendingAuthProfile,
} from "@/features/auth/server/pending-profile";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

export type AuthActionResult =
  | { status: "idle" }
  | { status: "success"; message?: string; redirectTo?: string }
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

function validationError(error: ZodError): AuthActionResult {
  return {
    status: "error",
    formError: "Проверьте заполненные поля.",
    fieldErrors: getZodFieldErrors(
      error,
      new Set(["firstName", "lastName", "email", "password", "code"]),
    ),
  };
}

function unexpectedAuthError(scope: string, error: unknown): AuthActionResult {
  logUnexpectedOperationError(`auth.${scope}`, error);
  return {
    status: "error",
    formError: "Сервис входа временно недоступен. Повторите попытку.",
  };
}

async function sendEmailVerificationCode(email: string) {
  return auth.emailOtp.sendVerificationOtp({
    email,
    type: "email-verification",
  });
}

export async function signUpAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const values = signUpSchema.parse(Object.fromEntries(formData));
    const { data, error } = await auth.signUp.email({
      email: values.email,
      password: values.password,
      name: `${values.firstName} ${values.lastName}`,
    });
    if (error) {
      const code = authErrorCode(error);
      if (code.includes("EXISTS") || code.includes("ALREADY")) {
        return {
          status: "error",
          formError: "Пользователь с таким email уже зарегистрирован.",
          fieldErrors: { email: "Войдите или восстановите пароль." },
        };
      }
      return unexpectedAuthError("sign-up", error);
    }

    const profile = {
      userId: data.user.id,
      firstName: values.firstName,
      lastName: values.lastName,
    };
    await saveAuthProfile(profile);
    await setPendingAuthProfile({ ...profile, email: values.email });

    const verification = await sendEmailVerificationCode(values.email);
    if (verification.error) return unexpectedAuthError("verification-send", verification.error);

    return {
      status: "success",
      redirectTo: `/auth/verify-email?email=${encodeURIComponent(values.email)}`,
    };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("sign-up", error);
  }
}

export async function signInAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const values = signInSchema.parse(Object.fromEntries(formData));
    const { data, error } = await auth.signIn.email(values);
    const code = authErrorCode(error);
    if (error && (code.includes("VERIF") || code.includes("CONFIRM"))) {
      await sendEmailVerificationCode(values.email);
      return {
        status: "success",
        redirectTo: `/auth/verify-email?email=${encodeURIComponent(values.email)}`,
      };
    }
    if (error) {
      if (
        code.includes("CREDENTIAL") ||
        code.includes("PASSWORD") ||
        code.includes("USER_NOT_FOUND")
      ) {
        return {
          status: "error",
          formError: "Неверный email или пароль.",
        };
      }
      return unexpectedAuthError("sign-in", error);
    }
    if (!data.user.emailVerified) {
      await auth.signOut();
      await sendEmailVerificationCode(values.email);
      return {
        status: "success",
        redirectTo: `/auth/verify-email?email=${encodeURIComponent(values.email)}`,
      };
    }
    return { status: "success", redirectTo: "/" };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("sign-in", error);
  }
}

export async function verifyEmailAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const values = verificationSchema.parse(Object.fromEntries(formData));
    const { data, error } = await auth.emailOtp.verifyEmail({
      email: values.email,
      otp: values.code,
    });
    if (error) {
      const code = authErrorCode(error);
      const expired = code.includes("EXPIRED");
      return {
        status: "error",
        formError: expired
          ? "Срок действия кода истёк. Запросите новый код."
          : "Код не подошёл. Проверьте его и повторите попытку.",
        fieldErrors: { code: expired ? "Код больше не действует." : "Неверный код." },
      };
    }

    const pending = await consumePendingAuthProfile(data.user.id, data.user.email);
    if (pending) await saveAuthProfile(pending);
    return { status: "success", redirectTo: "/" };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("verify-email", error);
  }
}

export async function resendVerificationCodeAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const { email } = emailOnlySchema.parse(Object.fromEntries(formData));
    const { error } = await sendEmailVerificationCode(email);
    if (error) {
      const code = authErrorCode(error);
      if (code.includes("RATE") || code.includes("TOO_MANY")) {
        return {
          status: "error",
          formError: "Новый код уже был отправлен. Подождите немного перед повтором.",
        };
      }
      return unexpectedAuthError("verification-resend", error);
    }
    return { status: "success", message: "Новый код отправлен на почту." };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("verification-resend", error);
  }
}

export async function requestPasswordResetAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const { email } = emailOnlySchema.parse(Object.fromEntries(formData));
    const { error } = await auth.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });
    if (error) {
      const code = authErrorCode(error);
      if (code.includes("RATE") || code.includes("TOO_MANY")) {
        return {
          status: "error",
          formError: "Код уже был отправлен. Подождите немного перед повтором.",
        };
      }
      return unexpectedAuthError("password-reset-request", error);
    }
    return {
      status: "success",
      redirectTo: `/auth/reset-password?email=${encodeURIComponent(email)}`,
    };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("password-reset-request", error);
  }
}

export async function resetPasswordAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const values = resetPasswordSchema.parse(Object.fromEntries(formData));
    const { error } = await resetPasswordWithEmailOtp({
      email: values.email,
      otp: values.code,
      password: values.password,
    });
    if (error) {
      const code = authErrorCode(error);
      const expired = code.includes("EXPIRED");
      const tooManyAttempts = code.includes("TOO_MANY");
      return {
        status: "error",
        formError: expired || tooManyAttempts
          ? "Срок действия кода истёк. Запросите восстановление ещё раз."
          : "Не удалось подтвердить код восстановления.",
        fieldErrors: {
          code:
            expired || tooManyAttempts
              ? "Запросите новый код."
              : "Неверный код.",
        },
      };
    }
    return {
      status: "success",
      redirectTo: "/auth/sign-in?notice=password-reset",
    };
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return unexpectedAuthError("password-reset", error);
  }
}

export async function signOutAction(): Promise<never> {
  await auth.signOut();
  redirect("/auth/sign-in");
}

export async function switchGroupAction(formData: FormData): Promise<never> {
  const groupReference = String(formData.get("groupId") ?? "");
  const { membership } = await requireGroupMembership(groupReference);
  const cookieStore = await cookies();
  cookieStore.set("rollcall.current-group", membership.group.publicId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(getMembershipHome(membership));
}

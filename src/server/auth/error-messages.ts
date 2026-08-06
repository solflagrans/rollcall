type AuthErrorLike = { code?: string; message?: string };

function normalizedError(error: AuthErrorLike) {
  return {
    code: error.code?.toUpperCase() ?? "",
    message: error.message?.toLowerCase() ?? "",
  };
}

export function isExistingUserError(error: AuthErrorLike) {
  const { code, message } = normalizedError(error);
  return code === "USER_ALREADY_EXISTS"
    || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
    || message.includes("user already exists");
}

export function isEmailNotVerifiedError(error: AuthErrorLike) {
  const { code, message } = normalizedError(error);
  return code === "EMAIL_NOT_VERIFIED" || message.includes("email not verified");
}

export function signupErrorMessage(error: AuthErrorLike) {
  const { code, message } = normalizedError(error);
  if (isExistingUserError(error)) {
    return "Аккаунт с таким email уже существует";
  }
  if (code === "INVALID_EMAIL") return "Укажите корректный email";
  if (code === "PASSWORD_TOO_SHORT" || code === "INVALID_PASSWORD") return "Пароль не соответствует требованиям безопасности";
  if (code === "INVALID_CALLBACK_URL" || code === "INVALID_ORIGIN" || code === "TRUSTED_ORIGIN_ERROR" || message.includes("invalid origin")) {
    return "Домен приложения не разрешён в настройках Neon Auth";
  }
  if (code === "SIGNUP_DISABLED" || code === "EMAIL_SIGNUP_DISABLED") {
    return "Регистрация по email отключена в настройках Neon Auth";
  }
  return "Neon Auth отклонил регистрацию. Проверьте настройки Auth в Neon Console";
}

export function verificationErrorMessage(error: AuthErrorLike) {
  const { code, message } = normalizedError(error);
  if (code === "INVALID_OTP" || message.includes("invalid otp")) return "Неверный код подтверждения";
  if (code === "OTP_EXPIRED" || message.includes("otp expired")) return "Срок действия кода истёк. Запросите новый";
  if (code === "TOO_MANY_ATTEMPTS" || message.includes("too many attempts")) return "Слишком много попыток. Запросите новый код";
  if (code === "INVALID_EMAIL") return "Укажите корректный email";
  if (code === "INVALID_ORIGIN" || code === "TRUSTED_ORIGIN_ERROR" || message.includes("invalid origin")) {
    return "Домен приложения не разрешён в настройках Neon Auth";
  }
  return "Не удалось подтвердить email. Попробуйте ещё раз";
}

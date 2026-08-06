type AuthErrorLike = { code?: string; message?: string };

export function signupErrorMessage(error: AuthErrorLike) {
  const code = error.code?.toUpperCase();
  const message = error.message?.toLowerCase() ?? "";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
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

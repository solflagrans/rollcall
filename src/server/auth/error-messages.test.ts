import { describe, expect, it } from "vitest";
import { isEmailNotVerifiedError, isExistingUserError, signupErrorMessage, verificationErrorMessage } from "./error-messages";

describe("signupErrorMessage", () => {
  it("distinguishes duplicate users from configuration failures", () => {
    expect(signupErrorMessage({ code: "USER_ALREADY_EXISTS" })).toBe("Аккаунт с таким email уже существует");
    expect(signupErrorMessage({ code: "validation_failed", message: "User already exists. Use another email." })).toBe("Аккаунт с таким email уже существует");
    expect(signupErrorMessage({ code: "INVALID_CALLBACK_URL" })).toBe("Домен приложения не разрешён в настройках Neon Auth");
    expect(signupErrorMessage({ code: "feature_not_supported", message: "Invalid origin" })).toBe("Домен приложения не разрешён в настройках Neon Auth");
    expect(signupErrorMessage({ code: "EMAIL_SIGNUP_DISABLED" })).toBe("Регистрация по email отключена в настройках Neon Auth");
  });

  it("recognizes recoverable authentication states", () => {
    expect(isExistingUserError({ code: "validation_failed", message: "User already exists. Use another email." })).toBe(true);
    expect(isEmailNotVerifiedError({ code: "FORBIDDEN", message: "Email not verified" })).toBe(true);
  });

  it("translates email verification errors", () => {
    expect(verificationErrorMessage({ code: "BAD_REQUEST", message: "Invalid OTP" })).toBe("Неверный код подтверждения");
    expect(verificationErrorMessage({ code: "BAD_REQUEST", message: "OTP expired" })).toBe("Срок действия кода истёк. Запросите новый");
    expect(verificationErrorMessage({ code: "FORBIDDEN", message: "Too many attempts" })).toBe("Слишком много попыток. Запросите новый код");
  });

  it("uses a safe diagnostic fallback", () => {
    expect(signupErrorMessage({ code: "UNKNOWN", message: "internal details" })).toBe("Neon Auth отклонил регистрацию. Проверьте настройки Auth в Neon Console");
  });
});

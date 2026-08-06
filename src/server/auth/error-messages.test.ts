import { describe, expect, it } from "vitest";
import { signupErrorMessage } from "./error-messages";

describe("signupErrorMessage", () => {
  it("distinguishes duplicate users from configuration failures", () => {
    expect(signupErrorMessage({ code: "USER_ALREADY_EXISTS" })).toBe("Аккаунт с таким email уже существует");
    expect(signupErrorMessage({ code: "INVALID_CALLBACK_URL" })).toBe("Домен приложения не разрешён в настройках Neon Auth");
    expect(signupErrorMessage({ code: "EMAIL_SIGNUP_DISABLED" })).toBe("Регистрация по email отключена в настройках Neon Auth");
  });

  it("uses a safe diagnostic fallback", () => {
    expect(signupErrorMessage({ code: "UNKNOWN", message: "internal details" })).toBe("Neon Auth отклонил регистрацию. Проверьте настройки Auth в Neon Console");
  });
});

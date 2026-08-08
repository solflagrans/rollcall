import { describe, expect, it } from "vitest";

import {
  resetPasswordSchema,
  signUpSchema,
  verificationSchema,
} from "@/features/auth/schemas";

describe("auth validation", () => {
  it("normalizes required profile names and email", () => {
    expect(
      signUpSchema.parse({
        firstName: "  Анна  Мария ",
        lastName: " Петрова ",
        email: " USER@EXAMPLE.COM ",
        password: "password1",
      }),
    ).toMatchObject({
      firstName: "Анна Мария",
      lastName: "Петрова",
      email: "user@example.com",
    });
  });

  it("requires a strong-enough password and numeric verification code", () => {
    expect(
      signUpSchema.safeParse({
        firstName: "Анна",
        lastName: "Петрова",
        email: "user@example.com",
        password: "abcdefgh",
      }).success,
    ).toBe(false);
    expect(
      verificationSchema.safeParse({ email: "user@example.com", code: "12-ab" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        email: "user@example.com",
        code: "123456",
        password: "newpass1",
      }).success,
    ).toBe(true);
  });
});

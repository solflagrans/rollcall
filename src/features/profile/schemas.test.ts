import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  updatePersonalDataSchema,
} from "@/features/profile/schemas";

describe("profile schemas", () => {
  it("normalizes required personal names", () => {
    expect(
      updatePersonalDataSchema.parse({
        firstName: "  Анна  Мария ",
        lastName: " Иванова ",
      }),
    ).toEqual({ firstName: "Анна Мария", lastName: "Иванова" });
  });

  it("requires matching strong new passwords", () => {
    const mismatch = changePasswordSchema.safeParse({
      currentPassword: "Old-pass-1",
      newPassword: "New-pass-2",
      confirmPassword: "New-pass-3",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }

    expect(
      changePasswordSchema.safeParse({
        currentPassword: "Old-pass-1",
        newPassword: "New-pass-2",
        confirmPassword: "New-pass-2",
      }).success,
    ).toBe(true);
  });
});

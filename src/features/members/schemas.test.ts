import { describe, expect, it } from "vitest";

import { memberFormSchema } from "@/features/members/schemas";

describe("member validation", () => {
  it("normalizes names and optional email", () => {
    expect(
      memberFormSchema.parse({
        lastName: "  Иванов  ",
        firstName: " Иван   Иванович ",
        email: " IVAN@EXAMPLE.COM ",
        role: "student",
      }),
    ).toEqual({
      lastName: "Иванов",
      firstName: "Иван Иванович",
      email: "ivan@example.com",
      role: "student",
    });
    expect(
      memberFormSchema.parse({
        lastName: "Сидоров",
        firstName: "Сидор",
        email: null,
        role: "student",
      }),
    ).toMatchObject({ email: null });
  });

  it("rejects invalid email, empty names, and the headman role in a regular form", () => {
    expect(
      memberFormSchema.safeParse({
        lastName: "",
        firstName: "Иван",
        email: "not-an-email",
        role: "headman",
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { memberFormSchema } from "@/features/members/schemas";

describe("member validation", () => {
  it("normalizes names", () => {
    expect(
      memberFormSchema.parse({
        lastName: "  Иванов  ",
        firstName: " Иван   Иванович ",
        role: "student",
      }),
    ).toEqual({
      lastName: "Иванов",
      firstName: "Иван Иванович",
      role: "student",
    });
  });

  it("rejects empty names and the headman role in a regular form", () => {
    expect(
      memberFormSchema.safeParse({
        lastName: "",
        firstName: "Иван",
        role: "headman",
      }).success,
    ).toBe(false);
  });
});

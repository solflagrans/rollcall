import { describe, expect, it } from "vitest";

import {
  disciplineFormSchema,
  disciplineSelectionSchema,
} from "@/features/disciplines/schemas";

describe("discipline validation", () => {
  it("normalizes a required discipline name", () => {
    expect(disciplineFormSchema.parse({ name: "  Высшая   математика  " })).toEqual({
      name: "Высшая математика",
    });
    expect(disciplineFormSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("requires at least one valid discipline reference", () => {
    expect(
      disciplineSelectionSchema.safeParse({ disciplineIds: [] }).success,
    ).toBe(false);
    expect(
      disciplineSelectionSchema.parse({ disciplineIds: ["discipline01"] }),
    ).toEqual({ disciplineIds: ["discipline01"] });
  });
});

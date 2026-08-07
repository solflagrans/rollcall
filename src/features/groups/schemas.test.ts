import { describe, expect, it } from "vitest";

import {
  academicPeriodFormSchema,
  createGroupSchema,
} from "@/features/groups/schemas";

describe("group validation", () => {
  it("accepts supported group names and normalizes them", () => {
    expect(createGroupSchema.parse({ name: "  ИВТ-21  " })).toEqual({ name: "ИВТ-21" });
    expect(createGroupSchema.parse({ name: "2436" })).toEqual({ name: "2436" });
  });

  it("rejects an empty normalized name", () => {
    expect(createGroupSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("academic period validation", () => {
  it("allows a one-day period", () => {
    expect(
      academicPeriodFormSchema.safeParse({
        number: 1,
        startsOn: "2026-09-01",
        endsOn: "2026-09-01",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid range and out-of-range period numbers", () => {
    const range = academicPeriodFormSchema.safeParse({
      number: 1,
      startsOn: "2026-09-02",
      endsOn: "2026-09-01",
    });
    expect(range.success).toBe(false);

    expect(
      academicPeriodFormSchema.safeParse({
        number: 0,
        startsOn: "2026-09-01",
        endsOn: "2026-09-02",
      }).success,
    ).toBe(false);
    expect(
      academicPeriodFormSchema.safeParse({
        number: 1.5,
        startsOn: "2026-09-01",
        endsOn: "2026-09-02",
      }).success,
    ).toBe(false);
    expect(
      academicPeriodFormSchema.safeParse({
        number: 1,
        startsOn: "2026-02-30",
        endsOn: "2026-03-01",
      }).success,
    ).toBe(false);
  });
});

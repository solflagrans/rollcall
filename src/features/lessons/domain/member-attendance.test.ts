import { describe, expect, it } from "vitest";

import { getMemberAttendancePeriodSelection } from "@/features/lessons/domain/member-attendance";

const periods = [
  {
    id: "old-with-attendance",
    number: 1,
    startsOn: "2025-09-01",
    endsOn: "2025-12-31",
  },
  {
    id: "empty-history",
    number: 2,
    startsOn: "2026-01-01",
    endsOn: "2026-05-31",
  },
  {
    id: "current",
    number: 3,
    startsOn: "2026-08-01",
    endsOn: "2026-12-31",
  },
  {
    id: "upcoming-with-attendance",
    number: 4,
    startsOn: "2027-01-01",
    endsOn: "2027-05-31",
  },
];

describe("getMemberAttendancePeriodSelection", () => {
  it("keeps attended history and the empty current period for an active member", () => {
    const selection = getMemberAttendancePeriodSelection(
      periods,
      new Set(["old-with-attendance", "upcoming-with-attendance"]),
      true,
      "2026-08-08",
    );

    expect(selection.availablePeriods.map(({ id }) => id)).toEqual([
      "old-with-attendance",
      "current",
    ]);
    expect(selection.defaultPeriod?.id).toBe("current");
  });

  it("excludes an empty current period for an inactive member", () => {
    const selection = getMemberAttendancePeriodSelection(
      periods,
      new Set(["old-with-attendance"]),
      false,
      "2026-08-08",
    );

    expect(selection.availablePeriods.map(({ id }) => id)).toEqual([
      "old-with-attendance",
    ]);
    expect(selection.defaultPeriod?.id).toBe("old-with-attendance");
  });

  it("selects the newest attended period when no current period is available", () => {
    const selection = getMemberAttendancePeriodSelection(
      periods.slice(0, 2),
      new Set(["old-with-attendance", "empty-history"]),
      true,
      "2026-08-08",
    );

    expect(selection.defaultPeriod?.id).toBe("empty-history");
  });

  it("returns no period when the member has no attendance or current context", () => {
    const selection = getMemberAttendancePeriodSelection(
      periods.slice(0, 2),
      new Set(),
      true,
      "2026-08-08",
    );

    expect(selection.availablePeriods).toEqual([]);
    expect(selection.defaultPeriod).toBeUndefined();
  });
});

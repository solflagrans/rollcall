import { describe, expect, it } from "vitest";

import {
  findOverlappingPeriods,
  findPeriodsWithInvertedNumberOrder,
  getPeriodStatus,
  getSuggestedPeriodNumber,
  selectDefaultPeriod,
} from "@/features/groups/domain/periods";
import { formatPeriodName } from "@/features/groups/presentation/period-copy";

describe("formatPeriodName", () => {
  it.each([
    ["semester", 1, "1 Семестр"],
    ["trimester", 2, "2 Триместр"],
    ["quarter", 3, "3 Четверть"],
    ["year", 1, "1 Учебный год"],
  ] as const)("formats %s periods", (type, number, expected) => {
    expect(formatPeriodName(type, number)).toBe(expected);
  });
});

describe("getSuggestedPeriodNumber", () => {
  it("uses one for an empty list", () => {
    expect(getSuggestedPeriodNumber([])).toBe(1);
  });

  it("increments the number of the chronologically latest item", () => {
    expect(
      getSuggestedPeriodNumber([
        { id: "later", number: 3, startsOn: "2026-09-01", endsOn: "2026-12-31" },
        { id: "earlier", number: 8, startsOn: "2026-01-01", endsOn: "2026-03-31" },
      ]),
    ).toBe(4);
  });
});

describe("findPeriodsWithInvertedNumberOrder", () => {
  const periods = [
    { id: "earlier", number: 4, startsOn: "2026-01-01", endsOn: "2026-03-31" },
    { id: "later", number: 6, startsOn: "2026-09-01", endsOn: "2026-12-31" },
  ];

  it("finds a later item with a smaller number", () => {
    expect(
      findPeriodsWithInvertedNumberOrder(
        { id: "new", number: 2, startsOn: "2026-04-01", endsOn: "2026-06-30" },
        periods,
      ),
    ).toEqual([periods[0]]);
  });

  it("warns when chronological neighbors use the same number", () => {
    expect(
      findPeriodsWithInvertedNumberOrder(
        { id: "new", number: 4, startsOn: "2026-04-01", endsOn: "2026-06-30" },
        periods,
      ),
    ).toEqual([periods[0]]);
  });

  it("accepts chronological numbering and excludes the edited item", () => {
    expect(
      findPeriodsWithInvertedNumberOrder(
        { id: "later", number: 6, startsOn: "2026-09-01", endsOn: "2026-12-31" },
        periods,
      ),
    ).toEqual([]);
  });
});

describe("getPeriodStatus", () => {
  it("uses inclusive calendar date boundaries", () => {
    expect(getPeriodStatus("2026-09-01", "2027-01-31", "2026-08-31")).toBe("upcoming");
    expect(getPeriodStatus("2026-09-01", "2027-01-31", "2026-09-01")).toBe("current");
    expect(getPeriodStatus("2026-09-01", "2027-01-31", "2027-01-31")).toBe("current");
    expect(getPeriodStatus("2026-09-01", "2027-01-31", "2027-02-01")).toBe("completed");
  });
});

describe("findOverlappingPeriods", () => {
  const periods = [
    { id: "a", number: 1, startsOn: "2026-01-01", endsOn: "2026-01-31" },
    { id: "b", number: 2, startsOn: "2026-03-01", endsOn: "2026-03-31" },
  ];

  it("finds inclusive intersections and excludes the edited period itself", () => {
    expect(
      findOverlappingPeriods({ startsOn: "2026-01-31", endsOn: "2026-02-10" }, periods),
    ).toEqual([periods[0]]);
    expect(
      findOverlappingPeriods(
        { id: "a", startsOn: "2026-01-01", endsOn: "2026-01-31" },
        periods,
      ),
    ).toEqual([]);
  });
});

describe("selectDefaultPeriod", () => {
  const periods = [
    { id: "completed", number: 1, startsOn: "2025-01-01", endsOn: "2025-05-31" },
    { id: "current-old", number: 2, startsOn: "2026-01-01", endsOn: "2026-12-31" },
    { id: "current-new", number: 3, startsOn: "2026-08-01", endsOn: "2026-10-31" },
    { id: "upcoming", number: 4, startsOn: "2027-01-01", endsOn: "2027-05-31" },
  ];

  it("selects the most recently started current period", () => {
    expect(selectDefaultPeriod(periods, "2026-08-07")?.id).toBe("current-new");
  });

  it("selects the closest upcoming period when none is current", () => {
    expect(selectDefaultPeriod(periods.slice(3), "2026-08-07")?.id).toBe("upcoming");
  });

  it("selects the latest completed period when all are completed", () => {
    expect(selectDefaultPeriod(periods.slice(0, 1), "2026-08-07")?.id).toBe("completed");
  });

  it("returns undefined for an empty list", () => {
    expect(selectDefaultPeriod([], "2026-08-07")).toBeUndefined();
  });
});

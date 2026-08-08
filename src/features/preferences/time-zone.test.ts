import { describe, expect, it } from "vitest";

import {
  getCalendarDateInTimeZone,
  isSupportedTimeZone,
} from "@/features/preferences/time-zone";

describe("user time zone", () => {
  it("uses the user's calendar day around UTC midnight", () => {
    const instant = new Date("2026-08-07T22:30:00Z");

    expect(getCalendarDateInTimeZone("UTC", instant)).toBe("2026-08-07");
    expect(getCalendarDateInTimeZone("Europe/Moscow", instant)).toBe("2026-08-08");
    expect(getCalendarDateInTimeZone("America/New_York", instant)).toBe("2026-08-07");
  });

  it("rejects invalid IANA zones", () => {
    expect(isSupportedTimeZone("Europe/Moscow")).toBe(true);
    expect(isSupportedTimeZone("Not/AZone")).toBe(false);
    expect(isSupportedTimeZone(undefined)).toBe(false);
  });
});

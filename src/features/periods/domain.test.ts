import { describe, expect, it } from "vitest";
import { formatPeriodLabel } from "./domain";

describe("period labels", () => {
  it("builds names from the configured system and number", () => {
    expect(formatPeriodLabel("semester", 1)).toBe("1 семестр");
    expect(formatPeriodLabel("trimester", 2)).toBe("2 триместр");
    expect(formatPeriodLabel("quarter", 3)).toBe("3 четверть");
    expect(formatPeriodLabel("year", 4)).toBe("4-й год");
  });
});

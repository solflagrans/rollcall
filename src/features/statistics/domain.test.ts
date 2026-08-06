import { calculateAttendance, percentage } from "./domain";

describe("attendance statistics", () => {
  it("counts present and late as attended and excludes excused", () => {
    expect(calculateAttendance(["present", "late", "absent", "excused"])).toEqual({ present: 1, late: 1, absent: 1, excused: 1, attended: 2, denominator: 3, percentage: 66.7 });
  });
  it("returns null when the denominator is zero", () => expect(calculateAttendance(["excused"]).percentage).toBeNull());
  it("rounds percentage to one decimal", () => expect(percentage(2, 3)).toBe(66.7));
});

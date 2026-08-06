import { attendanceStatuses, statusMeta } from "./constants";

describe("attendance status presentation", () => {
  it("provides an accessible label and unique short code for every status", () => {
    expect(new Set(attendanceStatuses.map((status) => statusMeta[status].short)).size).toBe(4);
    for (const status of attendanceStatuses) expect(statusMeta[status].label.length).toBeGreaterThan(3);
  });
});

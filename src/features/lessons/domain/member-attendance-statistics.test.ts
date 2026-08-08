import { describe, expect, it } from "vitest";

import {
  getMemberAttendanceStatistics,
  summarizeMemberAttendance,
} from "@/features/lessons/domain/member-attendance-statistics";

describe("member attendance statistics", () => {
  it("counts only present and late statuses as attended", () => {
    const summary = summarizeMemberAttendance([
      { status: "present" },
      { status: "late" },
      { status: "absent" },
      { status: "excused" },
    ]);

    expect(summary).toEqual({
      total: 4,
      attended: 2,
      percentage: 50,
      counts: {
        present: 1,
        late: 1,
        absent: 1,
        excused: 1,
      },
    });
  });

  it("returns no percentage when there are no completed lessons", () => {
    expect(summarizeMemberAttendance([])).toMatchObject({
      total: 0,
      attended: 0,
      percentage: null,
    });
  });

  it("builds independently calculated summaries by discipline", () => {
    const mathematics = { publicId: "mathematics", name: "Математика" };
    const physics = { publicId: "physics", name: "Физика" };
    const statistics = getMemberAttendanceStatistics([
      { discipline: physics, status: "absent" },
      { discipline: mathematics, status: "present" },
      { discipline: mathematics, status: "late" },
      { discipline: mathematics, status: "excused" },
      { discipline: physics, status: "late" },
    ]);

    expect(statistics.summary).toMatchObject({
      total: 5,
      attended: 3,
      percentage: 60,
    });
    expect(
      statistics.byDiscipline.map(({ discipline, total, attended, percentage }) => ({
        name: discipline.name,
        total,
        attended,
        percentage,
      })),
    ).toEqual([
      { name: "Математика", total: 3, attended: 2, percentage: 67 },
      { name: "Физика", total: 2, attended: 1, percentage: 50 },
    ]);
  });
});

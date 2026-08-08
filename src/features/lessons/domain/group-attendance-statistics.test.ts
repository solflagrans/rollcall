import { describe, expect, it } from "vitest";

import {
  getGroupAttendanceStatistics,
  summarizeCompletedGroupLessons,
  type GroupStatisticsLessonSource,
} from "@/features/lessons/domain/group-attendance-statistics";

const mathematics = { publicId: "mathematics", name: "Математика" };
const physics = { publicId: "physics", name: "Физика" };

function lesson(
  publicId: string,
  discipline: GroupStatisticsLessonSource["discipline"],
  statuses: GroupStatisticsLessonSource["attendance"][number]["status"][],
): GroupStatisticsLessonSource {
  return {
    publicId,
    discipline,
    attendance: statuses.map((status) => ({ status })),
  };
}

describe("group attendance statistics", () => {
  it("aggregates attendance records instead of averaging member percentages", () => {
    const summary = summarizeCompletedGroupLessons([
      lesson("first", mathematics, ["present", "late"]),
      lesson("second", mathematics, ["absent"]),
    ]);

    expect(summary).toEqual({
      lessonCount: 2,
      total: 3,
      attended: 2,
      percentage: 67,
      averageAttendedPerLesson: 1,
      counts: {
        present: 1,
        late: 1,
        absent: 1,
        excused: 0,
      },
    });
  });

  it("excludes an incomplete lesson together with its marked records", () => {
    const summary = summarizeCompletedGroupLessons([
      lesson("completed", mathematics, ["present", "excused"]),
      lesson("incomplete", physics, ["present", "late", null]),
    ]);

    expect(summary).toMatchObject({
      lessonCount: 1,
      total: 2,
      attended: 1,
      percentage: 50,
      averageAttendedPerLesson: 1,
      counts: {
        present: 1,
        late: 0,
        absent: 0,
        excused: 1,
      },
    });
  });

  it("builds discipline summaries from completed lessons only", () => {
    const statistics = getGroupAttendanceStatistics([
      lesson("math-1", mathematics, ["present", "present", "absent"]),
      lesson("math-2", mathematics, ["late", "excused"]),
      lesson("physics-1", physics, ["absent", "absent"]),
      lesson("physics-2", physics, ["present", null]),
    ]);

    expect(
      statistics.byDiscipline.map(
        ({ discipline, percentage, lessonCount, attended, total }) => ({
          name: discipline.name,
          percentage,
          lessonCount,
          attended,
          total,
        }),
      ),
    ).toEqual([
      {
        name: "Математика",
        percentage: 60,
        lessonCount: 2,
        attended: 3,
        total: 5,
      },
      {
        name: "Физика",
        percentage: 0,
        lessonCount: 1,
        attended: 0,
        total: 2,
      },
    ]);
  });

  it("does not return a percentage without attendance data", () => {
    expect(summarizeCompletedGroupLessons([])).toMatchObject({
      lessonCount: 0,
      total: 0,
      attended: 0,
      percentage: null,
      averageAttendedPerLesson: null,
    });
  });
});

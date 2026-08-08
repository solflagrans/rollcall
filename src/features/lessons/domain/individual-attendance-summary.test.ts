import { describe, expect, it } from "vitest";

import {
  getIndividualAttendanceSummary,
  sortIndividualAttendanceRows,
  type IndividualSummaryLessonSource,
  type IndividualSummaryMemberSource,
} from "@/features/lessons/domain/individual-attendance-summary";

const members: IndividualSummaryMemberSource[] = [
  {
    publicId: "active",
    firstName: "Анна",
    lastName: "Борисова",
    isActive: true,
  },
  {
    publicId: "historical",
    firstName: "Иван",
    lastName: "Алексеев",
    isActive: false,
  },
  {
    publicId: "without-data",
    firstName: "Пётр",
    lastName: "Волков",
    isActive: true,
  },
];

const mathematics = { publicId: "mathematics", name: "Математика" };
const physics = { publicId: "physics", name: "Физика" };

function lesson(
  publicId: string,
  discipline: IndividualSummaryLessonSource["discipline"],
  attendance: IndividualSummaryLessonSource["attendance"],
): IndividualSummaryLessonSource {
  return { publicId, discipline, attendance };
}

describe("individual attendance summary", () => {
  it("builds historical member totals and excludes incomplete lessons entirely", () => {
    const result = getIndividualAttendanceSummary(
      [
        lesson("math-completed", mathematics, [
          { groupMemberId: "active", status: "present" },
          { groupMemberId: "historical", status: "absent" },
        ]),
        lesson("physics-completed", physics, [
          { groupMemberId: "active", status: "late" },
          { groupMemberId: "historical", status: "excused" },
        ]),
        lesson("incomplete", physics, [
          { groupMemberId: "active", status: "absent" },
          { groupMemberId: "historical", status: null },
        ]),
      ],
      members,
    );

    expect(result.completedLessonCount).toBe(2);
    expect(result.hasData).toBe(true);
    expect(result.rows.map(({ member }) => member.publicId)).toEqual([
      "historical",
      "active",
      "without-data",
    ]);
    expect(result.rows.find(({ member }) => member.publicId === "active")?.summary)
      .toMatchObject({
        total: 2,
        attended: 2,
        percentage: 100,
        counts: { present: 1, late: 1, absent: 0, excused: 0 },
      });
    expect(
      result.rows.find(({ member }) => member.publicId === "historical")
        ?.summary,
    ).toMatchObject({
      total: 2,
      attended: 0,
      percentage: 0,
      counts: { present: 0, late: 0, absent: 1, excused: 1 },
    });
    expect(
      result.rows.find(({ member }) => member.publicId === "without-data")
        ?.summary,
    ).toMatchObject({ total: 0, attended: 0, percentage: null });
  });

  it("keeps missing member and discipline intersections as no data", () => {
    const result = getIndividualAttendanceSummary(
      [
        lesson("math", mathematics, [
          { groupMemberId: "active", status: "present" },
        ]),
        lesson("physics", physics, [
          { groupMemberId: "historical", status: "late" },
        ]),
      ],
      members,
    );

    const active = result.rows.find(
      ({ member }) => member.publicId === "active",
    );
    expect(
      active?.byDiscipline.map(({ discipline, percentage, attended, total }) => ({
        discipline: discipline.publicId,
        percentage,
        attended,
        total,
      })),
    ).toEqual([
      { discipline: "mathematics", percentage: 100, attended: 1, total: 1 },
      { discipline: "physics", percentage: null, attended: 0, total: 0 },
    ]);
  });

  it("sorts metrics with missing data last in both directions", () => {
    const result = getIndividualAttendanceSummary(
      [
        lesson("math", mathematics, [
          { groupMemberId: "active", status: "present" },
          { groupMemberId: "historical", status: "absent" },
        ]),
      ],
      members,
    );

    expect(
      sortIndividualAttendanceRows(result.rows, {
        field: "percentage",
        direction: "desc",
      }).map(({ member }) => member.publicId),
    ).toEqual(["active", "historical", "without-data"]);
    expect(
      sortIndividualAttendanceRows(result.rows, {
        field: "discipline",
        disciplineId: mathematics.publicId,
        direction: "asc",
      }).map(({ member }) => member.publicId),
    ).toEqual(["historical", "active", "without-data"]);
  });

  it("reports no data when every lesson is incomplete", () => {
    const result = getIndividualAttendanceSummary(
      [
        lesson("incomplete", mathematics, [
          { groupMemberId: "active", status: "present" },
          { groupMemberId: "historical", status: null },
        ]),
      ],
      members,
    );

    expect(result.completedLessonCount).toBe(0);
    expect(result.hasData).toBe(false);
    expect(result.disciplines).toEqual([]);
  });
});

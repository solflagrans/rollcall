import {
  attendanceStatuses,
  isLessonCompleted,
  type AttendanceStatus,
} from "@/features/lessons/domain/lessons";

export interface IndividualSummaryMemberSource {
  publicId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface IndividualSummaryLessonSource {
  publicId: string;
  discipline: {
    publicId: string;
    name: string;
  };
  attendance: Array<{
    groupMemberId: string;
    status: AttendanceStatus | null;
  }>;
}

export interface IndividualAttendanceTotals {
  total: number;
  attended: number;
  percentage: number | null;
  counts: Record<AttendanceStatus, number>;
}

export interface IndividualDisciplineAttendanceTotals
  extends IndividualAttendanceTotals {
  discipline: IndividualSummaryLessonSource["discipline"];
}

export interface IndividualAttendanceRow {
  member: IndividualSummaryMemberSource;
  summary: IndividualAttendanceTotals;
  byDiscipline: IndividualDisciplineAttendanceTotals[];
}

export type IndividualAttendanceSort =
  | {
      field: "name";
      direction: "asc" | "desc";
    }
  | {
      field: "percentage" | AttendanceStatus;
      direction: "asc" | "desc";
    }
  | {
      field: "discipline";
      disciplineId: string;
      direction: "asc" | "desc";
    };

export function getIndividualAttendanceSummary(
  lessons: readonly IndividualSummaryLessonSource[],
  members: readonly IndividualSummaryMemberSource[],
) {
  const completedLessons = lessons.filter(({ attendance }) =>
    isLessonCompleted(attendance),
  );
  const disciplines = new Map<
    string,
    IndividualSummaryLessonSource["discipline"]
  >();
  const attendanceByMember = new Map<
    string,
    {
      all: AttendanceStatus[];
      byDiscipline: Map<string, AttendanceStatus[]>;
    }
  >();

  for (const lesson of completedLessons) {
    disciplines.set(lesson.discipline.publicId, lesson.discipline);

    for (const entry of lesson.attendance) {
      if (entry.status === null) continue;
      const memberAttendance = attendanceByMember.get(entry.groupMemberId) ?? {
        all: [],
        byDiscipline: new Map<string, AttendanceStatus[]>(),
      };
      memberAttendance.all.push(entry.status);
      const disciplineAttendance =
        memberAttendance.byDiscipline.get(lesson.discipline.publicId) ?? [];
      disciplineAttendance.push(entry.status);
      memberAttendance.byDiscipline.set(
        lesson.discipline.publicId,
        disciplineAttendance,
      );
      attendanceByMember.set(entry.groupMemberId, memberAttendance);
    }
  }

  const sortedDisciplines = [...disciplines.values()].toSorted(
    (left, right) =>
      memberCollator.compare(left.name, right.name) ||
      left.publicId.localeCompare(right.publicId),
  );
  const rows = members.map((member) => {
    const memberAttendance = attendanceByMember.get(member.publicId);
    return {
      member,
      summary: summarizeStatuses(memberAttendance?.all ?? []),
      byDiscipline: sortedDisciplines.map((discipline) => ({
        discipline,
        ...summarizeStatuses(
          memberAttendance?.byDiscipline.get(discipline.publicId) ?? [],
        ),
      })),
    };
  });

  return {
    completedLessonCount: completedLessons.length,
    hasData: [...attendanceByMember.values()].some(({ all }) => all.length > 0),
    disciplines: sortedDisciplines,
    rows: sortIndividualAttendanceRows(rows, {
      field: "name",
      direction: "asc",
    }),
  };
}

export function sortIndividualAttendanceRows(
  rows: readonly IndividualAttendanceRow[],
  sort: IndividualAttendanceSort,
): IndividualAttendanceRow[] {
  return [...rows].toSorted((left, right) => {
    if (sort.field === "name") {
      return compareMemberNames(left, right) * directionMultiplier(sort.direction);
    }

    const leftValue = getSortValue(left, sort);
    const rightValue = getSortValue(right, sort);
    const valueOrder = compareNullableNumbers(
      leftValue,
      rightValue,
      sort.direction,
    );
    return valueOrder || compareMemberNames(left, right);
  });
}

function summarizeStatuses(
  statuses: readonly AttendanceStatus[],
): IndividualAttendanceTotals {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };

  for (const status of statuses) counts[status] += 1;

  const total = attendanceStatuses.reduce(
    (sum, status) => sum + counts[status],
    0,
  );
  const attended = counts.present + counts.late;
  return {
    total,
    attended,
    percentage: total === 0 ? null : Math.round((attended / total) * 100),
    counts,
  };
}

function getSortValue(
  row: IndividualAttendanceRow,
  sort: Exclude<IndividualAttendanceSort, { field: "name" }>,
): number | null {
  if (sort.field === "discipline") {
    return (
      row.byDiscipline.find(
        ({ discipline }) => discipline.publicId === sort.disciplineId,
      )?.percentage ?? null
    );
  }
  if (row.summary.total === 0) return null;
  return sort.field === "percentage"
    ? row.summary.percentage
    : row.summary.counts[sort.field];
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (left - right) * directionMultiplier(direction);
}

function compareMemberNames(
  left: IndividualAttendanceRow,
  right: IndividualAttendanceRow,
) {
  return (
    memberCollator.compare(left.member.lastName, right.member.lastName) ||
    memberCollator.compare(left.member.firstName, right.member.firstName) ||
    left.member.publicId.localeCompare(right.member.publicId)
  );
}

function directionMultiplier(direction: "asc" | "desc") {
  return direction === "asc" ? 1 : -1;
}

const memberCollator = new Intl.Collator("ru", {
  sensitivity: "base",
  numeric: true,
});

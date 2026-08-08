import type { AttendanceStatus } from "@/features/lessons/domain/lessons";

export interface MemberAttendanceStatisticsSource {
  status: AttendanceStatus;
  discipline: {
    publicId: string;
    name: string;
  };
}

export interface AttendanceSummary {
  total: number;
  attended: number;
  percentage: number | null;
  counts: Record<AttendanceStatus, number>;
}

export interface DisciplineAttendanceSummary extends AttendanceSummary {
  discipline: MemberAttendanceStatisticsSource["discipline"];
}

export function summarizeMemberAttendance(
  entries: readonly Pick<MemberAttendanceStatisticsSource, "status">[],
): AttendanceSummary {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };

  for (const entry of entries) counts[entry.status] += 1;

  const total = entries.length;
  const attended = counts.present + counts.late;
  return {
    total,
    attended,
    percentage: total === 0 ? null : Math.round((attended / total) * 100),
    counts,
  };
}

export function getMemberAttendanceStatistics(
  entries: readonly MemberAttendanceStatisticsSource[],
) {
  const entriesByDiscipline = new Map<
    string,
    {
      discipline: MemberAttendanceStatisticsSource["discipline"];
      entries: MemberAttendanceStatisticsSource[];
    }
  >();

  for (const entry of entries) {
    const current = entriesByDiscipline.get(entry.discipline.publicId);
    if (current) {
      current.entries.push(entry);
    } else {
      entriesByDiscipline.set(entry.discipline.publicId, {
        discipline: entry.discipline,
        entries: [entry],
      });
    }
  }

  const byDiscipline: DisciplineAttendanceSummary[] = [
    ...entriesByDiscipline.values(),
  ]
    .map(({ discipline, entries: disciplineEntries }) => ({
      discipline,
      ...summarizeMemberAttendance(disciplineEntries),
    }))
    .toSorted(
      (left, right) =>
        left.discipline.name.localeCompare(right.discipline.name, "ru") ||
        left.discipline.publicId.localeCompare(right.discipline.publicId),
    );

  return {
    summary: summarizeMemberAttendance(entries),
    byDiscipline,
  };
}

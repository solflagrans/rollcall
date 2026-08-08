import {
  isLessonCompleted,
  type AttendanceStatus,
} from "@/features/lessons/domain/lessons";

export interface GroupStatisticsLessonSource {
  publicId: string;
  discipline: {
    publicId: string;
    name: string;
  };
  attendance: Array<{
    status: AttendanceStatus | null;
  }>;
}

export interface GroupAttendanceSummary {
  lessonCount: number;
  total: number;
  attended: number;
  percentage: number | null;
  averageAttendedPerLesson: number | null;
  counts: Record<AttendanceStatus, number>;
}

export interface GroupDisciplineAttendanceSummary
  extends GroupAttendanceSummary {
  discipline: GroupStatisticsLessonSource["discipline"];
}

export function summarizeCompletedGroupLessons(
  lessons: readonly GroupStatisticsLessonSource[],
): GroupAttendanceSummary {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };
  const completedLessons = lessons.filter(({ attendance }) =>
    isLessonCompleted(attendance),
  );
  let attendedAcrossLessons = 0;

  for (const lesson of completedLessons) {
    let attendedAtLesson = 0;
    for (const entry of lesson.attendance) {
      if (entry.status === null) continue;
      counts[entry.status] += 1;
      if (entry.status === "present" || entry.status === "late") {
        attendedAtLesson += 1;
      }
    }
    attendedAcrossLessons += attendedAtLesson;
  }

  const lessonCount = completedLessons.length;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    lessonCount,
    total,
    attended: attendedAcrossLessons,
    percentage:
      total === 0 ? null : Math.round((attendedAcrossLessons / total) * 100),
    averageAttendedPerLesson:
      lessonCount === 0 ? null : attendedAcrossLessons / lessonCount,
    counts,
  };
}

export function getGroupAttendanceStatistics(
  lessons: readonly GroupStatisticsLessonSource[],
) {
  const completedLessons = lessons.filter(({ attendance }) =>
    isLessonCompleted(attendance),
  );
  const lessonsByDiscipline = new Map<
    string,
    {
      discipline: GroupStatisticsLessonSource["discipline"];
      lessons: GroupStatisticsLessonSource[];
    }
  >();

  for (const lesson of completedLessons) {
    const current = lessonsByDiscipline.get(lesson.discipline.publicId);
    if (current) {
      current.lessons.push(lesson);
    } else {
      lessonsByDiscipline.set(lesson.discipline.publicId, {
        discipline: lesson.discipline,
        lessons: [lesson],
      });
    }
  }

  const byDiscipline: GroupDisciplineAttendanceSummary[] = [
    ...lessonsByDiscipline.values(),
  ]
    .map(({ discipline, lessons: disciplineLessons }) => ({
      discipline,
      ...summarizeCompletedGroupLessons(disciplineLessons),
    }))
    .toSorted(
      (left, right) =>
        left.discipline.name.localeCompare(right.discipline.name, "ru") ||
        left.discipline.publicId.localeCompare(right.discipline.publicId),
    );

  return {
    summary: summarizeCompletedGroupLessons(completedLessons),
    byDiscipline,
  };
}

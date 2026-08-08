export const lessonTypes = [
  "lecture",
  "practice",
  "laboratory",
  "seminar",
] as const;

export const attendanceStatuses = [
  "present",
  "late",
  "absent",
  "excused",
] as const;

export type LessonType = (typeof lessonTypes)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export interface Lesson {
  id: string;
  publicId: string;
  periodId: string;
  disciplineId: string;
  lessonDate: string;
  lessonType: LessonType;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonAttendance {
  lessonId: string;
  groupMemberId: string;
  status: AttendanceStatus | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceDraft {
  groupMemberId: string;
  status: AttendanceStatus | null;
  comment: string | null;
}

export function getAttendanceProgress(
  attendance: readonly Pick<AttendanceDraft, "status">[],
) {
  const total = attendance.length;
  const marked = attendance.filter(({ status }) => status !== null).length;
  return { total, marked, unmarked: total - marked, completed: marked === total };
}

export function fillUnmarkedAttendance<T extends AttendanceDraft>(
  attendance: readonly T[],
  status: AttendanceStatus,
): T[] {
  return attendance.map((entry) =>
    entry.status === null ? { ...entry, status } : entry,
  );
}

export function resetAttendance<T extends AttendanceDraft>(
  attendance: readonly T[],
): T[] {
  return attendance.map((entry) => ({
    ...entry,
    status: null,
    comment: null,
  }));
}

export function isLessonCompleted(
  attendance: readonly Pick<AttendanceDraft, "status">[],
): boolean {
  return getAttendanceProgress(attendance).completed;
}

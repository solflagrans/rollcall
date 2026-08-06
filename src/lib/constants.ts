export const membershipRoles = ["headman", "deputy", "student"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const attendanceStatuses = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const lessonTypes = ["lecture", "practice", "laboratory"] as const;
export type LessonType = (typeof lessonTypes)[number];

export const statusMeta: Record<AttendanceStatus, { label: string; short: string }> = {
  present: { label: "Присутствовал", short: "П" },
  absent: { label: "Отсутствовал", short: "Н" },
  late: { label: "Опоздал", short: "О" },
  excused: { label: "Уважительная причина", short: "У" },
};

export const roleLabels: Record<MembershipRole, string> = {
  headman: "Староста",
  deputy: "Заместитель",
  student: "Студент",
};

export const lessonTypeLabels: Record<LessonType, string> = {
  lecture: "Лекция",
  practice: "Практика",
  laboratory: "Лабораторная",
};

import type {
  AttendanceStatus,
  LessonType,
} from "@/features/lessons/domain/lessons";

export const lessonTypeCopy: Record<LessonType, string> = {
  lecture: "Лекция",
  practice: "Практика",
  laboratory: "Лабораторная работа",
  seminar: "Семинар",
};

export const attendanceStatusCopy: Record<AttendanceStatus, string> = {
  present: "Присутствовал",
  late: "Опоздал",
  absent: "Отсутствовал",
  excused: "Уважительная",
};

export const unmarkedAttendanceLabel = "Не отмечено";

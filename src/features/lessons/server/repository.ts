import type { Discipline } from "@/features/disciplines/domain/disciplines";
import type {
  AcademicPeriod,
  Group,
} from "@/features/groups/domain/models";
import type {
  AttendanceStatus,
  Lesson,
  LessonAttendance,
  LessonType,
} from "@/features/lessons/domain/lessons";
import type { GroupMember } from "@/features/members/domain/members";

export interface LessonWriteValues {
  lessonDate: string;
  lessonType: LessonType;
}

export interface AttendanceWriteValues {
  groupMemberId: string;
  status: AttendanceStatus | null;
  comment: string | null;
}

export interface LessonCreationContext {
  group: Group;
  period?: AcademicPeriod;
  disciplines: Discipline[];
  activeMembers: GroupMember[];
}

export interface LessonGroupPeriodContext {
  group: Group;
  period?: AcademicPeriod;
}

export interface PeriodLessonRow {
  lesson: Lesson;
  discipline: Discipline;
}

export interface PeriodAttendanceRow {
  attendance: LessonAttendance;
  member: GroupMember;
}

export interface LessonWithAttendance extends PeriodLessonRow {
  attendance: PeriodAttendanceRow[];
}

export interface PeriodJournalRows {
  activeMembers: GroupMember[];
  lessonRows: PeriodLessonRow[];
  attendanceRows: PeriodAttendanceRow[];
}

export interface LessonsRepository {
  findGroupPeriod(
    groupReference: string,
    periodReference: string,
  ): Promise<LessonGroupPeriodContext | undefined>;
  listPeriodDisciplines(groupId: string, periodId: string): Promise<Discipline[]>;
  listActiveMembers(groupId: string): Promise<GroupMember[]>;
  getPeriodJournalRows(groupId: string, periodId: string): Promise<PeriodJournalRows>;
  findLesson(
    periodId: string,
    lessonReference: string,
  ): Promise<PeriodLessonRow | undefined>;
  findLessonWithAttendance(
    periodId: string,
    lessonReference: string,
  ): Promise<LessonWithAttendance | undefined>;
  listLessonAttendance(lessonId: string): Promise<PeriodAttendanceRow[]>;
  updateLessonAttendance(
    lessonId: string,
    attendance: AttendanceWriteValues[],
  ): Promise<LessonAttendance[]>;
  updateLesson(
    lessonId: string,
    disciplineId: string,
    values: LessonWriteValues,
  ): Promise<Lesson | undefined>;
  deleteLessonWithAttendance(lessonId: string): Promise<Lesson | undefined>;
  insertLessonWithAttendance(
    periodId: string,
    disciplineId: string,
    values: LessonWriteValues,
    attendance: AttendanceWriteValues[],
  ): Promise<{ lesson: Lesson; attendance: LessonAttendance[] }>;
}

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

export interface LessonsRepository {
  findGroup(groupReference: string): Promise<Group | undefined>;
  findPeriod(
    groupId: string,
    periodReference: string,
  ): Promise<AcademicPeriod | undefined>;
  listPeriodDisciplines(groupId: string, periodId: string): Promise<Discipline[]>;
  listActiveMembers(groupId: string): Promise<GroupMember[]>;
  insertLessonWithAttendance(
    periodId: string,
    disciplineId: string,
    values: LessonWriteValues,
    attendance: AttendanceWriteValues[],
  ): Promise<{ lesson: Lesson; attendance: LessonAttendance[] }>;
}

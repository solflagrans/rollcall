import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { entityIdSchema } from "@/features/groups/schemas";
import type {
  AttendanceWriteValues,
  LessonsRepository,
  LessonWriteValues,
} from "@/features/lessons/server/repository";
import { getDatabase } from "@/server/db/client";
import {
  academicPeriodDisciplines,
  academicPeriods,
  disciplines,
  groupMembers,
  groups,
  lessonAttendance,
  lessons,
} from "@/server/db/schema";

export class DrizzleLessonsRepository implements LessonsRepository {
  private readonly database = getDatabase();

  async findGroup(groupReference: string) {
    const [group] = await this.database
      .select()
      .from(groups)
      .where(
        entityIdSchema.safeParse(groupReference).success
          ? eq(groups.id, groupReference)
          : eq(groups.publicId, groupReference),
      )
      .limit(1);
    return group;
  }

  async findPeriod(groupId: string, periodReference: string) {
    const [period] = await this.database
      .select()
      .from(academicPeriods)
      .where(
        and(
          eq(academicPeriods.groupId, groupId),
          entityIdSchema.safeParse(periodReference).success
            ? eq(academicPeriods.id, periodReference)
            : eq(academicPeriods.publicId, periodReference),
        ),
      )
      .limit(1);
    return period;
  }

  async listPeriodDisciplines(groupId: string, periodId: string) {
    const rows = await this.database
      .select({ discipline: disciplines })
      .from(academicPeriodDisciplines)
      .innerJoin(
        disciplines,
        eq(disciplines.id, academicPeriodDisciplines.disciplineId),
      )
      .where(
        and(
          eq(academicPeriodDisciplines.periodId, periodId),
          eq(disciplines.groupId, groupId),
        ),
      )
      .orderBy(asc(disciplines.name), asc(disciplines.id));
    return rows.map(({ discipline }) => discipline);
  }

  async listActiveMembers(groupId: string) {
    return this.database
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.isActive, true)))
      .orderBy(
        asc(groupMembers.lastName),
        asc(groupMembers.firstName),
        asc(groupMembers.id),
      );
  }

  async insertLessonWithAttendance(
    periodId: string,
    disciplineId: string,
    values: LessonWriteValues,
    attendance: AttendanceWriteValues[],
  ) {
    const lessonId = crypto.randomUUID();
    const lessonInsert = this.database
      .insert(lessons)
      .values({ id: lessonId, periodId, disciplineId, ...values })
      .returning();

    if (attendance.length === 0) {
      const [createdLessons] = await this.database.batch([lessonInsert]);
      const lesson = createdLessons[0];
      if (!lesson) throw new Error("Lesson insert returned no row");
      return { lesson, attendance: [] };
    }

    const attendanceInsert = this.database
      .insert(lessonAttendance)
      .values(
        attendance.map((entry) => ({
          lessonId,
          ...entry,
        })),
      )
      .returning();
    const [createdLessons, createdAttendance] = await this.database.batch([
      lessonInsert,
      attendanceInsert,
    ]);
    const lesson = createdLessons[0];
    if (!lesson) throw new Error("Lesson insert returned no row");
    return { lesson, attendance: createdAttendance };
  }
}

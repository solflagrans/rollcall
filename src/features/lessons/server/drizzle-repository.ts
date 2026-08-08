import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  notExists,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { entityIdSchema } from "@/features/groups/schemas";
import type {
  AttendanceWriteValues,
  LessonsRepository,
  LessonWriteValues,
} from "@/features/lessons/server/repository";
import { getDatabase } from "@/server/db/client";
import { readWithRetry } from "@/server/db/read-retry";
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

  async findGroupPeriod(groupReference: string, periodReference: string) {
    const groupFilter = entityIdSchema.safeParse(groupReference).success
      ? eq(groups.id, groupReference)
      : eq(groups.publicId, groupReference);
    const periodFilter = entityIdSchema.safeParse(periodReference).success
      ? eq(academicPeriods.id, periodReference)
      : eq(academicPeriods.publicId, periodReference);
    const [row] = await readWithRetry("lessons.group-period", () =>
      this.database
        .select({ group: groups, period: academicPeriods })
        .from(groups)
        .leftJoin(
          academicPeriods,
          and(eq(academicPeriods.groupId, groups.id), periodFilter),
        )
        .where(groupFilter)
        .limit(1),
    );
    if (!row) return undefined;
    return { group: row.group, period: row.period ?? undefined };
  }

  async listPeriodDisciplines(groupId: string, periodId: string) {
    const rows = await readWithRetry("lessons.period-disciplines", () =>
      this.database
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
        .orderBy(asc(disciplines.name), asc(disciplines.id)),
    );
    return rows.map(({ discipline }) => discipline);
  }

  async listActiveMembers(groupId: string) {
    return readWithRetry("lessons.active-members", () =>
      this.activeMembersQuery(groupId),
    );
  }

  async getPeriodJournalRows(groupId: string, periodId: string) {
    const activeMembersQuery = this.activeMembersQuery(groupId);
    const lessonsQuery = this.database
      .select({ lesson: lessons, discipline: disciplines })
      .from(lessons)
      .innerJoin(disciplines, eq(disciplines.id, lessons.disciplineId))
      .where(eq(lessons.periodId, periodId))
      .orderBy(asc(lessons.lessonDate), asc(lessons.createdAt), asc(lessons.id));
    const attendanceQuery = this.database
      .select({ attendance: lessonAttendance, member: groupMembers })
      .from(lessonAttendance)
      .innerJoin(lessons, eq(lessons.id, lessonAttendance.lessonId))
      .innerJoin(groupMembers, eq(groupMembers.id, lessonAttendance.groupMemberId))
      .where(eq(lessons.periodId, periodId))
      .orderBy(
        asc(groupMembers.lastName),
        asc(groupMembers.firstName),
        asc(groupMembers.id),
      );
    const [activeMembers, lessonRows, attendanceRows] = await readWithRetry(
      "lessons.period-journal",
      () =>
        this.database.batch([
          activeMembersQuery,
          lessonsQuery,
          attendanceQuery,
        ]),
    );
    return { activeMembers, lessonRows, attendanceRows };
  }

  async listCompletedMemberAttendance(periodId: string, memberId: string) {
    const incompleteAttendance = alias(
      lessonAttendance,
      "incomplete_attendance",
    );
    const rows = await readWithRetry("lessons.completed-member-attendance", () =>
      this.database
        .select({
          lesson: lessons,
          discipline: disciplines,
          attendance: lessonAttendance,
        })
        .from(lessonAttendance)
        .innerJoin(lessons, eq(lessons.id, lessonAttendance.lessonId))
        .innerJoin(disciplines, eq(disciplines.id, lessons.disciplineId))
        .where(
          and(
            eq(lessons.periodId, periodId),
            eq(lessonAttendance.groupMemberId, memberId),
            isNotNull(lessonAttendance.status),
            notExists(
              this.database
                .select({ lessonId: incompleteAttendance.lessonId })
                .from(incompleteAttendance)
                .where(
                  and(
                    eq(incompleteAttendance.lessonId, lessons.id),
                    isNull(incompleteAttendance.status),
                  ),
                ),
            ),
          ),
        )
        .orderBy(
          desc(lessons.lessonDate),
          desc(lessons.createdAt),
          desc(lessons.id),
        ),
    );

    return rows.flatMap(({ lesson, discipline, attendance }) =>
      attendance.status
        ? [
            {
              lesson,
              discipline,
              attendance: { ...attendance, status: attendance.status },
            },
          ]
        : [],
    );
  }

  async listMemberAttendancePeriodIds(memberId: string) {
    const rows = await readWithRetry("lessons.member-attendance-periods", () =>
      this.database
        .selectDistinct({ periodId: lessons.periodId })
        .from(lessonAttendance)
        .innerJoin(lessons, eq(lessons.id, lessonAttendance.lessonId))
        .where(eq(lessonAttendance.groupMemberId, memberId)),
    );
    return rows.map(({ periodId }) => periodId);
  }

  async findLesson(periodId: string, lessonReference: string) {
    const [row] = await readWithRetry("lessons.find", () =>
      this.database
        .select({ lesson: lessons, discipline: disciplines })
        .from(lessons)
        .innerJoin(disciplines, eq(disciplines.id, lessons.disciplineId))
        .where(this.lessonReferenceFilter(periodId, lessonReference))
        .limit(1),
    );
    return row;
  }

  async findLessonWithAttendance(periodId: string, lessonReference: string) {
    const rows = await readWithRetry("lessons.find-with-attendance", () =>
      this.database
        .select({
          lesson: lessons,
          discipline: disciplines,
          attendance: lessonAttendance,
          member: groupMembers,
        })
        .from(lessons)
        .innerJoin(disciplines, eq(disciplines.id, lessons.disciplineId))
        .leftJoin(lessonAttendance, eq(lessonAttendance.lessonId, lessons.id))
        .leftJoin(groupMembers, eq(groupMembers.id, lessonAttendance.groupMemberId))
        .where(this.lessonReferenceFilter(periodId, lessonReference))
        .orderBy(
          asc(groupMembers.lastName),
          asc(groupMembers.firstName),
          asc(groupMembers.id),
        ),
    );
    const first = rows[0];
    if (!first) return undefined;
    return {
      lesson: first.lesson,
      discipline: first.discipline,
      attendance: rows.flatMap(({ attendance, member }) =>
        attendance && member ? [{ attendance, member }] : [],
      ),
    };
  }

  async listLessonAttendance(lessonId: string) {
    return readWithRetry("lessons.attendance", () =>
      this.database
        .select({ attendance: lessonAttendance, member: groupMembers })
        .from(lessonAttendance)
        .innerJoin(groupMembers, eq(groupMembers.id, lessonAttendance.groupMemberId))
        .where(eq(lessonAttendance.lessonId, lessonId))
        .orderBy(
          asc(groupMembers.lastName),
          asc(groupMembers.firstName),
          asc(groupMembers.id),
        ),
    );
  }

  private activeMembersQuery(groupId: string) {
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

  private lessonReferenceFilter(periodId: string, lessonReference: string) {
    return and(
      eq(lessons.periodId, periodId),
      entityIdSchema.safeParse(lessonReference).success
        ? eq(lessons.id, lessonReference)
        : eq(lessons.publicId, lessonReference),
    );
  }

  async updateLessonAttendance(
    lessonId: string,
    attendance: AttendanceWriteValues[],
  ) {
    if (attendance.length === 0) return [];
    return this.database
      .insert(lessonAttendance)
      .values(attendance.map((entry) => ({ lessonId, ...entry })))
      .onConflictDoUpdate({
        target: [lessonAttendance.lessonId, lessonAttendance.groupMemberId],
        set: {
          status: sql`excluded.status`,
          comment: sql`excluded.comment`,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async updateLesson(
    lessonId: string,
    disciplineId: string,
    values: LessonWriteValues,
  ) {
    const [lesson] = await this.database
      .update(lessons)
      .set({ disciplineId, ...values, updatedAt: new Date() })
      .where(eq(lessons.id, lessonId))
      .returning();
    return lesson;
  }

  async deleteLessonWithAttendance(lessonId: string) {
    const attendanceDelete = this.database
      .delete(lessonAttendance)
      .where(eq(lessonAttendance.lessonId, lessonId));
    const lessonDelete = this.database
      .delete(lessons)
      .where(eq(lessons.id, lessonId))
      .returning();
    const [, deletedLessons] = await this.database.batch([
      attendanceDelete,
      lessonDelete,
    ]);
    return deletedLessons[0];
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

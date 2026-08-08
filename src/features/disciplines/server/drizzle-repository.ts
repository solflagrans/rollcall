import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { DisciplinesRepository } from "@/features/disciplines/server/repository";
import { entityIdSchema } from "@/features/groups/schemas";
import { getDatabase } from "@/server/db/client";
import { readWithRetry } from "@/server/db/read-retry";
import {
  academicPeriodDisciplines,
  academicPeriods,
  disciplines,
  lessons,
} from "@/server/db/schema";

export class DrizzleDisciplinesRepository implements DisciplinesRepository {
  private readonly database = getDatabase();

  async listDisciplines(groupId: string) {
    return readWithRetry("disciplines.list", () =>
      this.database
        .select()
        .from(disciplines)
        .where(eq(disciplines.groupId, groupId))
        .orderBy(asc(disciplines.name), asc(disciplines.id)),
    );
  }

  async findDiscipline(groupId: string, disciplineReference: string) {
    const [discipline] = await readWithRetry("disciplines.find", () =>
      this.database
        .select()
        .from(disciplines)
        .where(
          and(
            eq(disciplines.groupId, groupId),
            entityIdSchema.safeParse(disciplineReference).success
              ? eq(disciplines.id, disciplineReference)
              : eq(disciplines.publicId, disciplineReference),
          ),
        )
        .limit(1),
    );
    return discipline;
  }

  async insertDiscipline(groupId: string, name: string) {
    const [discipline] = await this.database
      .insert(disciplines)
      .values({ groupId, name })
      .returning();
    if (!discipline) throw new Error("Discipline insert returned no row");
    return discipline;
  }

  async renameDiscipline(groupId: string, disciplineId: string, name: string) {
    const [discipline] = await this.database
      .update(disciplines)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(disciplines.groupId, groupId), eq(disciplines.id, disciplineId)))
      .returning();
    return discipline;
  }

  async setDisciplineArchived(
    groupId: string,
    disciplineId: string,
    isArchived: boolean,
  ) {
    const [discipline] = await this.database
      .update(disciplines)
      .set({ isArchived, updatedAt: new Date() })
      .where(and(eq(disciplines.groupId, groupId), eq(disciplines.id, disciplineId)))
      .returning();
    return discipline;
  }

  async hasDisciplineBlockingReferences(disciplineId: string) {
    const [assignment] = await readWithRetry(
      "disciplines.blocking-references",
      () =>
        this.database
          .select({ disciplineId: academicPeriodDisciplines.disciplineId })
          .from(academicPeriodDisciplines)
          .where(eq(academicPeriodDisciplines.disciplineId, disciplineId))
          .limit(1),
    );
    if (assignment) return true;

    // Future lessons and statistics should be checked here before physical deletion.
    return false;
  }

  async deleteDiscipline(groupId: string, disciplineId: string) {
    const [discipline] = await this.database
      .delete(disciplines)
      .where(and(eq(disciplines.groupId, groupId), eq(disciplines.id, disciplineId)))
      .returning();
    return discipline;
  }

  async listPeriodDisciplines(groupId: string, periodId: string) {
    const rows = await readWithRetry("period-disciplines.list", () =>
      this.database
        .select({ discipline: disciplines })
        .from(academicPeriodDisciplines)
        .innerJoin(
          academicPeriods,
          eq(academicPeriods.id, academicPeriodDisciplines.periodId),
        )
        .innerJoin(
          disciplines,
          eq(disciplines.id, academicPeriodDisciplines.disciplineId),
        )
        .where(
          and(
            eq(academicPeriodDisciplines.periodId, periodId),
            eq(academicPeriods.groupId, groupId),
            eq(disciplines.groupId, groupId),
          ),
        )
        .orderBy(asc(disciplines.name), asc(disciplines.id)),
    );
    return rows.map(({ discipline }) => discipline);
  }

  async listPeriodDisciplineIds(periodId: string) {
    const rows = await readWithRetry("period-disciplines.list-ids", () =>
      this.database
        .select({ disciplineId: academicPeriodDisciplines.disciplineId })
        .from(academicPeriodDisciplines)
        .where(eq(academicPeriodDisciplines.periodId, periodId)),
    );
    return rows.map(({ disciplineId }) => disciplineId);
  }

  async addPeriodDisciplines(periodId: string, disciplineIds: string[]) {
    if (disciplineIds.length === 0) return [];
    return this.database
      .insert(academicPeriodDisciplines)
      .values(disciplineIds.map((disciplineId) => ({ periodId, disciplineId })))
      .onConflictDoNothing()
      .returning();
  }

  async hasPeriodDisciplineBlockingReferences(
    periodId: string,
    disciplineId: string,
  ) {
    const [lesson] = await readWithRetry(
      "period-disciplines.blocking-references",
      () =>
        this.database
          .select({ id: lessons.id })
          .from(lessons)
          .where(
            and(
              eq(lessons.periodId, periodId),
              eq(lessons.disciplineId, disciplineId),
            ),
          )
          .limit(1),
    );
    return Boolean(lesson);
  }

  async removePeriodDiscipline(periodId: string, disciplineId: string) {
    const removed = await this.database
      .delete(academicPeriodDisciplines)
      .where(
        and(
          eq(academicPeriodDisciplines.periodId, periodId),
          eq(academicPeriodDisciplines.disciplineId, disciplineId),
        ),
      )
      .returning({ disciplineId: academicPeriodDisciplines.disciplineId });
    return removed.length > 0;
  }
}

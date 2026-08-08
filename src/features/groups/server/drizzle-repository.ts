import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { PeriodType } from "@/features/groups/domain/periods";
import type { GroupContext } from "@/features/groups/domain/models";
import { entityIdSchema } from "@/features/groups/schemas";
import type {
  PeriodWriteValues,
  RollcallRepository,
} from "@/features/groups/server/repository";
import { getDatabase } from "@/server/db/client";
import {
  academicPeriods,
  groups,
  lessons,
} from "@/server/db/schema";

export class DrizzleRollcallRepository implements RollcallRepository {
  private readonly database = getDatabase();

  private groupReferenceFilter(groupReference: string) {
    return entityIdSchema.safeParse(groupReference).success
      ? eq(groups.id, groupReference)
      : eq(groups.publicId, groupReference);
  }

  async listGroups() {
    return this.database.select().from(groups).orderBy(asc(groups.createdAt), asc(groups.id));
  }

  async findGroup(groupId: string) {
    const [group] = await this.database
      .select()
      .from(groups)
      .where(this.groupReferenceFilter(groupId))
      .limit(1);
    return group;
  }

  async findGroupWithPeriods(groupId: string): Promise<GroupContext | undefined> {
    const rows = await this.database
      .select({ group: groups, period: academicPeriods })
      .from(groups)
      .leftJoin(academicPeriods, eq(academicPeriods.groupId, groups.id))
      .where(this.groupReferenceFilter(groupId))
      .orderBy(
        asc(academicPeriods.startsOn),
        asc(academicPeriods.number),
        asc(academicPeriods.id),
      );
    const first = rows[0];
    if (!first) return undefined;

    return {
      group: first.group,
      periods: rows.flatMap(({ period }) => (period ? [period] : [])),
    };
  }

  async insertGroup(name: string, periodType: PeriodType) {
    const [group] = await this.database
      .insert(groups)
      .values({ name, periodType })
      .returning();
    if (!group) throw new Error("Group insert returned no row");
    return group;
  }

  async updateGroup(groupId: string, name: string) {
    const [group] = await this.database
      .update(groups)
      .set({ name, updatedAt: new Date() })
      .where(this.groupReferenceFilter(groupId))
      .returning();
    return group;
  }

  async listPeriods(groupId: string) {
    return this.database
      .select()
      .from(academicPeriods)
      .where(eq(academicPeriods.groupId, groupId))
      .orderBy(asc(academicPeriods.startsOn), asc(academicPeriods.number), asc(academicPeriods.id));
  }

  async findPeriod(groupId: string, periodId: string) {
    const [period] = await this.database
      .select()
      .from(academicPeriods)
      .where(
        and(
          eq(academicPeriods.groupId, groupId),
          entityIdSchema.safeParse(periodId).success
            ? eq(academicPeriods.id, periodId)
            : eq(academicPeriods.publicId, periodId),
        ),
      )
      .limit(1);
    return period;
  }

  async getPeriodLessonDateBounds(periodId: string) {
    const [bounds] = await this.database
      .select({
        earliestLessonDate: sql<string | null>`min(${lessons.lessonDate})`,
        latestLessonDate: sql<string | null>`max(${lessons.lessonDate})`,
      })
      .from(lessons)
      .where(eq(lessons.periodId, periodId));
    if (!bounds?.earliestLessonDate || !bounds.latestLessonDate) return undefined;
    return {
      earliestLessonDate: bounds.earliestLessonDate,
      latestLessonDate: bounds.latestLessonDate,
    };
  }

  async insertPeriod(groupId: string, values: PeriodWriteValues) {
    const [period] = await this.database
      .insert(academicPeriods)
      .values({ groupId, ...values })
      .returning();
    if (!period) throw new Error("Academic period insert returned no row");
    return period;
  }

  async updatePeriod(groupId: string, periodId: string, values: PeriodWriteValues) {
    const [period] = await this.database
      .update(academicPeriods)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(academicPeriods.groupId, groupId), eq(academicPeriods.id, periodId)))
      .returning();
    return period;
  }
}

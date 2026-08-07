import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { PeriodType } from "@/features/groups/domain/periods";
import type {
  PeriodWriteValues,
  RollcallRepository,
} from "@/features/groups/server/repository";
import { getDatabase } from "@/server/db/client";
import {
  academicPeriods,
  groups,
} from "@/server/db/schema";

export class DrizzleRollcallRepository implements RollcallRepository {
  private readonly database = getDatabase();

  async listGroups() {
    return this.database.select().from(groups).orderBy(asc(groups.createdAt), asc(groups.id));
  }

  async findGroup(groupId: string) {
    const [group] = await this.database
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    return group;
  }

  async insertGroup(name: string) {
    const [group] = await this.database.insert(groups).values({ name }).returning();
    if (!group) throw new Error("Group insert returned no row");
    return group;
  }

  async updateGroup(groupId: string, name: string) {
    const [group] = await this.database
      .update(groups)
      .set({ name, updatedAt: new Date() })
      .where(eq(groups.id, groupId))
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
      .where(and(eq(academicPeriods.groupId, groupId), eq(academicPeriods.id, periodId)))
      .limit(1);
    return period;
  }

  async insertFirstPeriodAtomic(
    groupId: string,
    periodType: PeriodType,
    values: PeriodWriteValues,
  ) {
    const result = await this.database.execute<{ id: string }>(sql`
      with updated_group as (
        update ${groups}
        set ${groups.periodType} = ${periodType}, ${groups.updatedAt} = now()
        where ${groups.id} = ${groupId}
          and ${groups.periodType} is null
          and not exists (
            select 1 from ${academicPeriods}
            where ${academicPeriods.groupId} = ${groupId}
          )
        returning ${groups.id}
      )
      insert into ${academicPeriods} (
        ${academicPeriods.groupId},
        ${academicPeriods.number},
        ${academicPeriods.startsOn},
        ${academicPeriods.endsOn}
      )
      select
        updated_group.id,
        ${values.number},
        ${values.startsOn}::date,
        ${values.endsOn}::date
      from updated_group
      returning ${academicPeriods.id}
    `);

    const insertedId = result.rows[0]?.id;
    return insertedId ? this.findPeriod(groupId, insertedId) : undefined;
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

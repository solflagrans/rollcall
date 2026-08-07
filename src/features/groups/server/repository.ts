import type { PeriodType } from "@/features/groups/domain/periods";
import type { AcademicPeriodRecord, GroupRecord } from "@/server/db/schema";

export interface PeriodWriteValues {
  number: number;
  startsOn: string;
  endsOn: string;
}

export interface RollcallRepository {
  listGroups(): Promise<GroupRecord[]>;
  findGroup(groupId: string): Promise<GroupRecord | undefined>;
  insertGroup(name: string): Promise<GroupRecord>;
  updateGroup(groupId: string, name: string): Promise<GroupRecord | undefined>;
  listPeriods(groupId: string): Promise<AcademicPeriodRecord[]>;
  findPeriod(groupId: string, periodId: string): Promise<AcademicPeriodRecord | undefined>;
  insertFirstPeriodAtomic(
    groupId: string,
    periodType: PeriodType,
    values: PeriodWriteValues,
  ): Promise<AcademicPeriodRecord | undefined>;
  insertPeriod(groupId: string, values: PeriodWriteValues): Promise<AcademicPeriodRecord>;
  updatePeriod(
    groupId: string,
    periodId: string,
    values: PeriodWriteValues,
  ): Promise<AcademicPeriodRecord | undefined>;
}

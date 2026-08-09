import type { PeriodType } from "@/features/groups/domain/periods";
import type {
  AcademicPeriod,
  Group,
  GroupContext,
} from "@/features/groups/domain/models";

export interface PeriodWriteValues {
  number: number;
  startsOn: string;
  endsOn: string;
}

export interface PeriodLessonDateBounds {
  earliestLessonDate: string;
  latestLessonDate: string;
}

export interface GroupCreator {
  userId: string;
  firstName: string;
  lastName: string;
}

export interface RollcallRepository {
  listGroups(): Promise<Group[]>;
  findGroup(groupId: string): Promise<Group | undefined>;
  findGroupWithPeriods(groupId: string): Promise<GroupContext | undefined>;
  insertGroupWithHeadman(
    name: string,
    periodType: PeriodType,
    creator: GroupCreator,
  ): Promise<Group>;
  updateGroup(groupId: string, name: string): Promise<Group | undefined>;
  listPeriods(groupId: string): Promise<AcademicPeriod[]>;
  findPeriod(groupId: string, periodId: string): Promise<AcademicPeriod | undefined>;
  getPeriodLessonDateBounds(
    periodId: string,
  ): Promise<PeriodLessonDateBounds | undefined>;
  insertPeriod(groupId: string, values: PeriodWriteValues): Promise<AcademicPeriod>;
  updatePeriod(
    groupId: string,
    periodId: string,
    values: PeriodWriteValues,
  ): Promise<AcademicPeriod | undefined>;
}

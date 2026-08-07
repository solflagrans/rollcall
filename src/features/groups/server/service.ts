import {
  findOverlappingPeriods,
  getTodayDate,
  selectDefaultPeriod,
  type PeriodSummary,
} from "@/features/groups/domain/periods";
import {
  createAcademicPeriodSchema,
  createFirstAcademicPeriodSchema,
  createGroupSchema,
  entityIdSchema,
  updateAcademicPeriodSchema,
  updateGroupSchema,
  type CreateAcademicPeriodInput,
  type CreateFirstAcademicPeriodInput,
  type CreateGroupInput,
  type UpdateAcademicPeriodInput,
  type UpdateGroupInput,
} from "@/features/groups/schemas";
import { GroupServiceError, isUniqueViolation } from "@/features/groups/server/errors";
import type { RollcallRepository } from "@/features/groups/server/repository";
import type { AcademicPeriodRecord } from "@/server/db/schema";

export type PeriodMutationResult =
  | { kind: "saved"; period: AcademicPeriodRecord }
  | { kind: "overlap"; periods: AcademicPeriodRecord[] };

export class GroupsService {
  constructor(private readonly repository: RollcallRepository) {}

  async createGroup(input: CreateGroupInput) {
    const values = createGroupSchema.parse(input);
    return this.repository.insertGroup(values.name);
  }

  async updateGroup(groupId: string, input: UpdateGroupInput) {
    entityIdSchema.parse(groupId);
    const values = updateGroupSchema.parse(input);
    const group = await this.repository.updateGroup(groupId, values.name);
    if (!group) throw new GroupServiceError("group_not_found");
    return group;
  }

  async getGroup(groupId: string) {
    entityIdSchema.parse(groupId);
    return this.repository.findGroup(groupId);
  }

  async getGroups() {
    return this.repository.listGroups();
  }

  async createFirstAcademicPeriod(
    groupId: string,
    input: CreateFirstAcademicPeriodInput,
  ): Promise<PeriodMutationResult> {
    entityIdSchema.parse(groupId);
    const values = createFirstAcademicPeriodSchema.parse(input);
    const group = await this.repository.findGroup(groupId);
    if (!group) throw new GroupServiceError("group_not_found");

    const periods = await this.repository.listPeriods(groupId);
    if (group.periodType !== null || periods.length > 0) {
      throw new GroupServiceError("period_type_already_set");
    }

    if (!values.forceOverlap) {
      const overlaps = findOverlappingPeriods(values, periods);
      if (overlaps.length > 0) return { kind: "overlap", periods: overlaps };
    }

    try {
      const period = await this.repository.insertFirstPeriodAtomic(
        groupId,
        values.periodType,
        values,
      );
      if (!period) throw new GroupServiceError("first_period_conflict");
      return { kind: "saved", period };
    } catch (error) {
      if (isUniqueViolation(error)) throw new GroupServiceError("duplicate_period_number");
      throw error;
    }
  }

  async createAcademicPeriod(
    groupId: string,
    input: CreateAcademicPeriodInput,
  ): Promise<PeriodMutationResult> {
    entityIdSchema.parse(groupId);
    const values = createAcademicPeriodSchema.parse(input);
    const group = await this.repository.findGroup(groupId);
    if (!group) throw new GroupServiceError("group_not_found");
    if (!group.periodType) throw new GroupServiceError("period_type_missing");

    const periods = await this.repository.listPeriods(groupId);
    if (periods.some((period) => period.number === values.number)) {
      throw new GroupServiceError("duplicate_period_number");
    }

    if (!values.forceOverlap) {
      const overlaps = findOverlappingPeriods(values, periods);
      if (overlaps.length > 0) return { kind: "overlap", periods: overlaps };
    }

    try {
      return {
        kind: "saved",
        period: await this.repository.insertPeriod(groupId, values),
      };
    } catch (error) {
      if (isUniqueViolation(error)) throw new GroupServiceError("duplicate_period_number");
      throw error;
    }
  }

  async updateAcademicPeriod(
    groupId: string,
    periodId: string,
    input: UpdateAcademicPeriodInput,
  ): Promise<PeriodMutationResult> {
    entityIdSchema.parse(groupId);
    entityIdSchema.parse(periodId);
    const values = updateAcademicPeriodSchema.parse(input);
    const group = await this.repository.findGroup(groupId);
    if (!group) throw new GroupServiceError("group_not_found");

    const period = await this.repository.findPeriod(groupId, periodId);
    if (!period) throw new GroupServiceError("period_not_owned");

    const periods = await this.repository.listPeriods(groupId);
    if (periods.some((candidate) => candidate.id !== periodId && candidate.number === values.number)) {
      throw new GroupServiceError("duplicate_period_number");
    }

    if (!values.forceOverlap) {
      const overlaps = findOverlappingPeriods({ ...values, id: periodId }, periods);
      if (overlaps.length > 0) return { kind: "overlap", periods: overlaps };
    }

    try {
      const updated = await this.repository.updatePeriod(groupId, periodId, values);
      if (!updated) throw new GroupServiceError("period_not_owned");
      return { kind: "saved", period: updated };
    } catch (error) {
      if (isUniqueViolation(error)) throw new GroupServiceError("duplicate_period_number");
      throw error;
    }
  }

  async getAcademicPeriod(groupId: string, periodId: string) {
    entityIdSchema.parse(groupId);
    entityIdSchema.parse(periodId);
    return this.repository.findPeriod(groupId, periodId);
  }

  async getAcademicPeriods(groupId: string) {
    entityIdSchema.parse(groupId);
    return this.repository.listPeriods(groupId);
  }

  async getDefaultAcademicPeriod(groupId: string, today = getTodayDate()) {
    const periods = await this.getAcademicPeriods(groupId);
    return selectDefaultPeriod(periods, today);
  }

  async checkPeriodOverlap(
    groupId: string,
    period: PeriodSummary,
  ): Promise<AcademicPeriodRecord[]> {
    const periods = await this.getAcademicPeriods(groupId);
    return findOverlappingPeriods(period, periods);
  }
}

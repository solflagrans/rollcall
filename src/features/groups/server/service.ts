import {
  findOverlappingPeriods,
  selectDefaultPeriod,
  type PeriodSummary,
} from "@/features/groups/domain/periods";
import {
  createAcademicPeriodSchema,
  createGroupSchema,
  entityReferenceSchema,
  updateAcademicPeriodSchema,
  updateGroupSchema,
  type CreateAcademicPeriodInput,
  type CreateGroupInput,
  type UpdateAcademicPeriodInput,
  type UpdateGroupInput,
} from "@/features/groups/schemas";
import {
  GroupServiceError,
  isExclusionViolation,
} from "@/features/groups/server/errors";
import type {
  AcademicPeriod,
  Group,
  GroupPeriodContext,
} from "@/features/groups/domain/models";
import type {
  GroupCreator,
  RollcallRepository,
} from "@/features/groups/server/repository";

export type PeriodMutationResult =
  | { kind: "saved"; group: Group; period: AcademicPeriod }
  | { kind: "overlap"; group: Group; periods: AcademicPeriod[] };

export class GroupsService {
  constructor(private readonly repository: RollcallRepository) {}

  private async requireGroupContext(groupReference: string) {
    const reference = entityReferenceSchema.parse(groupReference);
    const context = await this.repository.findGroupWithPeriods(reference);
    if (!context) throw new GroupServiceError("group_not_found");
    return context;
  }

  async createGroup(input: CreateGroupInput, creator: GroupCreator) {
    const values = createGroupSchema.parse(input);
    return this.repository.insertGroupWithHeadman(
      values.name,
      values.periodType,
      creator,
    );
  }

  async updateGroup(groupReference: string, input: UpdateGroupInput) {
    const reference = entityReferenceSchema.parse(groupReference);
    const values = updateGroupSchema.parse(input);
    const updated = await this.repository.updateGroup(reference, values.name);
    if (!updated) throw new GroupServiceError("group_not_found");
    return updated;
  }

  async getGroup(groupReference: string) {
    const reference = entityReferenceSchema.safeParse(groupReference);
    if (!reference.success) return undefined;
    return this.repository.findGroup(reference.data);
  }

  async getGroups() {
    return this.repository.listGroups();
  }

  async getGroupContext(groupReference: string) {
    const reference = entityReferenceSchema.safeParse(groupReference);
    if (!reference.success) return undefined;
    return this.repository.findGroupWithPeriods(reference.data);
  }

  async getGroupPeriodContext(
    groupReference: string,
    periodReference: string,
  ): Promise<GroupPeriodContext | undefined> {
    const context = await this.getGroupContext(groupReference);
    const period = entityReferenceSchema.safeParse(periodReference);
    if (!context || !period.success) return context;
    return {
      ...context,
      period: context.periods.find(
        (candidate) =>
          candidate.id === period.data || candidate.publicId === period.data,
      ),
    };
  }

  async createAcademicPeriod(
    groupReference: string,
    input: CreateAcademicPeriodInput,
  ): Promise<PeriodMutationResult> {
    const periodValues = createAcademicPeriodSchema.parse(input);
    const { group, periods } = await this.requireGroupContext(groupReference);

    const overlaps = findOverlappingPeriods(periodValues, periods);
    if (overlaps.length > 0) return { kind: "overlap", group, periods: overlaps };

    try {
      return {
        kind: "saved",
        group,
        period: await this.repository.insertPeriod(group.id, periodValues),
      };
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new GroupServiceError("overlapping_period_dates");
      }
      throw error;
    }
  }

  async updateAcademicPeriod(
    groupReference: string,
    periodReference: string,
    input: UpdateAcademicPeriodInput,
  ): Promise<PeriodMutationResult> {
    entityReferenceSchema.parse(periodReference);
    const periodValues = updateAcademicPeriodSchema.parse(input);
    const { group, periods } = await this.requireGroupContext(groupReference);
    const period = periods.find(
      (candidate) =>
        candidate.id === periodReference || candidate.publicId === periodReference,
    );
    if (!period) throw new GroupServiceError("period_not_owned");

    const overlaps = findOverlappingPeriods({ ...periodValues, id: period.id }, periods);
    if (overlaps.length > 0) return { kind: "overlap", group, periods: overlaps };

    const lessonDateBounds = await this.repository.getPeriodLessonDateBounds(period.id);
    if (
      lessonDateBounds &&
      periodValues.startsOn > lessonDateBounds.earliestLessonDate
    ) {
      throw new GroupServiceError(
        "period_starts_after_earliest_lesson",
        lessonDateBounds.earliestLessonDate,
      );
    }
    if (
      lessonDateBounds &&
      periodValues.endsOn < lessonDateBounds.latestLessonDate
    ) {
      throw new GroupServiceError(
        "period_ends_before_latest_lesson",
        lessonDateBounds.latestLessonDate,
      );
    }

    try {
      const updated = await this.repository.updatePeriod(group.id, period.id, periodValues);
      if (!updated) throw new GroupServiceError("period_not_owned");
      return { kind: "saved", group, period: updated };
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new GroupServiceError("overlapping_period_dates");
      }
      throw error;
    }
  }

  async getAcademicPeriod(groupReference: string, periodReference: string) {
    return (await this.getGroupPeriodContext(groupReference, periodReference))?.period;
  }

  async getAcademicPeriods(groupReference: string) {
    return (await this.getGroupContext(groupReference))?.periods ?? [];
  }

  async getDefaultAcademicPeriod(groupReference: string, today: string) {
    const periods = await this.getAcademicPeriods(groupReference);
    return selectDefaultPeriod(periods, today);
  }

  async checkPeriodOverlap(
    groupReference: string,
    period: PeriodSummary,
  ): Promise<AcademicPeriod[]> {
    const periods = await this.getAcademicPeriods(groupReference);
    return findOverlappingPeriods(period, periods);
  }
}

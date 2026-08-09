import { beforeEach, describe, expect, it } from "vitest";

import type { PeriodType } from "@/features/groups/domain/periods";
import type {
  AcademicPeriod,
  Group,
} from "@/features/groups/domain/models";
import { GroupServiceError } from "@/features/groups/server/errors";
import type {
  GroupCreator,
  PeriodLessonDateBounds,
  PeriodWriteValues,
  RollcallRepository,
} from "@/features/groups/server/repository";
import { GroupsService } from "@/features/groups/server/service";

function uuid(sequence: number) {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function publicId(sequence: number) {
  return `p${String(sequence).padStart(11, "0")}`;
}

class MemoryRepository implements RollcallRepository {
  groups: Group[] = [];
  periods: AcademicPeriod[] = [];
  lessonDateBounds = new Map<string, PeriodLessonDateBounds>();
  private sequence = 1;

  async listGroups() {
    return [...this.groups];
  }

  async findGroup(groupId: string) {
    return this.groups.find((group) => group.id === groupId || group.publicId === groupId);
  }

  async findGroupWithPeriods(groupId: string) {
    const group = await this.findGroup(groupId);
    if (!group) return undefined;
    return { group, periods: await this.listPeriods(group.id) };
  }

  async insertGroupWithHeadman(
    name: string,
    periodType: PeriodType,
    _creator: GroupCreator,
  ) {
    void _creator;
    const now = new Date("2026-08-07T00:00:00Z");
    const group: Group = {
      id: uuid(this.sequence++),
      publicId: publicId(this.sequence),
      name,
      periodType,
      createdAt: now,
      updatedAt: now,
    };
    this.groups.push(group);
    return group;
  }

  async updateGroup(groupId: string, name: string) {
    const group = await this.findGroup(groupId);
    if (!group) return undefined;
    group.name = name;
    group.updatedAt = new Date("2026-08-08T00:00:00Z");
    return group;
  }

  async listPeriods(groupId: string) {
    return this.periods.filter((period) => period.groupId === groupId);
  }

  async findPeriod(groupId: string, periodId: string) {
    return this.periods.find(
      (period) =>
        period.groupId === groupId &&
        (period.id === periodId || period.publicId === periodId),
    );
  }

  async getPeriodLessonDateBounds(periodId: string) {
    return this.lessonDateBounds.get(periodId);
  }

  private createPeriod(groupId: string, values: PeriodWriteValues) {
    const now = new Date("2026-08-07T00:00:00Z");
    const period: AcademicPeriod = {
      id: uuid(this.sequence++),
      publicId: publicId(this.sequence),
      groupId,
      ...values,
      createdAt: now,
      updatedAt: now,
    };
    this.periods.push(period);
    return period;
  }

  async insertPeriod(groupId: string, values: PeriodWriteValues) {
    return this.createPeriod(groupId, values);
  }

  async updatePeriod(groupId: string, periodId: string, values: PeriodWriteValues) {
    const period = await this.findPeriod(groupId, periodId);
    if (!period) return undefined;
    Object.assign(period, values, { updatedAt: new Date("2026-08-08T00:00:00Z") });
    return period;
  }
}

describe("GroupsService integration", () => {
  let repository: MemoryRepository;
  let service: GroupsService;
  const creator: GroupCreator = {
    userId: "auth-user-1",
    firstName: "Пётр",
    lastName: "Петров",
  };

  const createGroup = (input: Parameters<GroupsService["createGroup"]>[0]) =>
    service.createGroup(input, creator);

  beforeEach(() => {
    repository = new MemoryRepository();
    service = new GroupsService(repository);
  });

  it("stores the selected period type on the group and keeps it while renaming", async () => {
    const group = await createGroup({ name: "  ИВТ-21  ", periodType: "quarter" });
    expect(group).toMatchObject({ name: "ИВТ-21", periodType: "quarter" });
    expect(await service.getAcademicPeriods(group.id)).toEqual([]);

    const updated = await service.updateGroup(group.id, { name: " ИВТ-22 " });
    expect(updated).toMatchObject({ name: "ИВТ-22", periodType: "quarter" });
  });

  it("resolves groups and periods by public IDs while keeping UUIDs internal", async () => {
    const group = await createGroup({ name: "2436", periodType: "semester" });
    const created = await service.createAcademicPeriod(group.publicId, {
      number: 1,
      startsOn: "2026-09-01",
      endsOn: "2027-01-31",
    });
    if (created.kind !== "saved") throw new Error("Expected saved semester");

    expect((await service.getGroup(group.publicId))?.id).toBe(group.id);
    expect(
      (await service.getAcademicPeriod(group.publicId, created.period.publicId))?.id,
    ).toBe(created.period.id);
    expect(await service.getGroup("incorrect-id")).toBeUndefined();
    expect(await service.getAcademicPeriod(group.publicId, "incorrect-id")).toBeUndefined();
  });

  it("creates a new item after all previous items were deleted", async () => {
    const group = await createGroup({ name: "2436", periodType: "trimester" });
    await service.createAcademicPeriod(group.publicId, {
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-04-30",
    });
    repository.periods = [];

    const recreated = await service.createAcademicPeriod(group.publicId, {
      number: 2,
      startsOn: "2026-05-01",
      endsOn: "2026-08-31",
    });

    expect(recreated.kind).toBe("saved");
    expect((await service.getGroup(group.publicId))?.periodType).toBe("trimester");
  });

  it("allows the same number in one group when date ranges do not overlap", async () => {
    const firstGroup = await createGroup({ name: "A", periodType: "year" });
    const secondGroup = await createGroup({ name: "B", periodType: "year" });
    for (const group of [firstGroup, secondGroup]) {
      await service.createAcademicPeriod(group.id, {
        number: 1,
        startsOn: "2026-01-01",
        endsOn: "2026-12-31",
      });
    }

    const repeated = await service.createAcademicPeriod(firstGroup.id, {
      number: 1,
      startsOn: "2027-01-01",
      endsOn: "2027-12-31",
    });
    expect(repeated.kind).toBe("saved");
    expect(await service.getAcademicPeriods(firstGroup.id)).toHaveLength(2);
    expect(await service.getAcademicPeriods(secondGroup.id)).toHaveLength(1);
  });

  it("blocks overlapping dates", async () => {
    const group = await createGroup({ name: "A", periodType: "semester" });
    await service.createAcademicPeriod(group.id, {
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-06-30",
    });

    const overlap = await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-06-01",
      endsOn: "2026-12-31",
    });

    expect(overlap.kind).toBe("overlap");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(1);
  });

  it("saves inverted chronological numbering because the warning is informational", async () => {
    const group = await createGroup({ name: "A", periodType: "quarter" });
    await service.createAcademicPeriod(group.id, {
      number: 4,
      startsOn: "2026-01-01",
      endsOn: "2026-03-31",
    });

    const saved = await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-04-01",
      endsOn: "2026-06-30",
    });
    expect(saved.kind).toBe("saved");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(2);
  });

  it("updates a period, checks ownership, and excludes itself from validation", async () => {
    const firstGroup = await createGroup({ name: "A", periodType: "trimester" });
    const secondGroup = await createGroup({ name: "B", periodType: "trimester" });
    const created = await service.createAcademicPeriod(firstGroup.id, {
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-04-30",
    });
    if (created.kind !== "saved") throw new Error("Expected saved trimester");

    const updated = await service.updateAcademicPeriod(firstGroup.id, created.period.id, {
      number: 2,
      startsOn: "2026-01-01",
      endsOn: "2026-05-31",
    });
    expect(updated.kind).toBe("saved");

    await expect(
      service.updateAcademicPeriod(secondGroup.id, created.period.id, {
        number: 2,
        startsOn: "2026-01-01",
        endsOn: "2026-05-31",
      }),
    ).rejects.toBeInstanceOf(GroupServiceError);
  });

  it("does not allow period dates to exclude existing lessons", async () => {
    const group = await createGroup({ name: "A", periodType: "semester" });
    const created = await service.createAcademicPeriod(group.id, {
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-06-30",
    });
    if (created.kind !== "saved") throw new Error("Expected saved period");
    repository.lessonDateBounds.set(created.period.id, {
      earliestLessonDate: "2026-02-10",
      latestLessonDate: "2026-05-20",
    });

    await expect(
      service.updateAcademicPeriod(group.id, created.period.id, {
        number: 1,
        startsOn: "2026-02-11",
        endsOn: "2026-06-30",
      }),
    ).rejects.toMatchObject({
      code: "period_starts_after_earliest_lesson",
      conflictingLessonDate: "2026-02-10",
    });

    await expect(
      service.updateAcademicPeriod(group.id, created.period.id, {
        number: 1,
        startsOn: "2026-01-01",
        endsOn: "2026-05-19",
      }),
    ).rejects.toMatchObject({
      code: "period_ends_before_latest_lesson",
      conflictingLessonDate: "2026-05-20",
    });

    await expect(
      service.updateAcademicPeriod(group.id, created.period.id, {
        number: 1,
        startsOn: "2026-02-10",
        endsOn: "2026-05-20",
      }),
    ).resolves.toMatchObject({ kind: "saved" });
  });

  it("selects the default item from dates without remembering the last selection", async () => {
    const group = await createGroup({ name: "A", periodType: "semester" });
    await service.createAcademicPeriod(group.id, {
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-06-30",
    });
    await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-08-01",
      endsOn: "2026-12-31",
    });

    expect((await service.getDefaultAcademicPeriod(group.id, "2026-09-01"))?.number).toBe(2);
    expect((await service.getDefaultAcademicPeriod(group.id, "2026-07-01"))?.number).toBe(2);
  });
});

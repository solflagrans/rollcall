import { beforeEach, describe, expect, it } from "vitest";

import type { PeriodType } from "@/features/groups/domain/periods";
import { GroupServiceError } from "@/features/groups/server/errors";
import type {
  PeriodWriteValues,
  RollcallRepository,
} from "@/features/groups/server/repository";
import { GroupsService } from "@/features/groups/server/service";
import type { AcademicPeriodRecord, GroupRecord } from "@/server/db/schema";

function uuid(sequence: number) {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

class MemoryRepository implements RollcallRepository {
  groups: GroupRecord[] = [];
  periods: AcademicPeriodRecord[] = [];
  failNextFirstPeriodInsert = false;
  private sequence = 1;

  async listGroups() {
    return [...this.groups];
  }

  async findGroup(groupId: string) {
    return this.groups.find((group) => group.id === groupId);
  }

  async insertGroup(name: string) {
    const now = new Date("2026-08-07T00:00:00Z");
    const group: GroupRecord = {
      id: uuid(this.sequence++),
      name,
      periodType: null,
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
    return this.periods.find((period) => period.groupId === groupId && period.id === periodId);
  }

  private createPeriod(groupId: string, values: PeriodWriteValues) {
    const now = new Date("2026-08-07T00:00:00Z");
    const period: AcademicPeriodRecord = {
      id: uuid(this.sequence++),
      groupId,
      ...values,
      createdAt: now,
      updatedAt: now,
    };
    this.periods.push(period);
    return period;
  }

  async insertFirstPeriodAtomic(
    groupId: string,
    periodType: PeriodType,
    values: PeriodWriteValues,
  ) {
    const group = await this.findGroup(groupId);
    if (!group || group.periodType !== null || (await this.listPeriods(groupId)).length > 0) {
      return undefined;
    }

    group.periodType = periodType;
    if (this.failNextFirstPeriodInsert) {
      group.periodType = null;
      this.failNextFirstPeriodInsert = false;
      throw new Error("simulated insert failure");
    }
    return this.createPeriod(groupId, values);
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

  beforeEach(() => {
    repository = new MemoryRepository();
    service = new GroupsService(repository);
  });

  it("creates and updates a group without requiring a period", async () => {
    const group = await service.createGroup({ name: "  ИВТ-21  " });
    expect(group.name).toBe("ИВТ-21");
    expect(await service.getAcademicPeriods(group.id)).toEqual([]);

    const updated = await service.updateGroup(group.id, { name: " ИВТ-22 " });
    expect(updated.name).toBe("ИВТ-22");
  });

  it("atomically saves periodType with the first period", async () => {
    const group = await service.createGroup({ name: "2436" });
    const result = await service.createFirstAcademicPeriod(group.id, {
      periodType: "semester",
      number: 1,
      startsOn: "2026-09-01",
      endsOn: "2027-01-31",
    });

    expect(result.kind).toBe("saved");
    expect((await service.getGroup(group.id))?.periodType).toBe("semester");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(1);
  });

  it("rolls periodType back when first-period creation fails", async () => {
    const group = await service.createGroup({ name: "2436" });
    repository.failNextFirstPeriodInsert = true;

    await expect(
      service.createFirstAcademicPeriod(group.id, {
        periodType: "quarter",
        number: 1,
        startsOn: "2026-09-01",
        endsOn: "2026-10-31",
      }),
    ).rejects.toThrow("simulated insert failure");
    expect((await service.getGroup(group.id))?.periodType).toBeNull();
    expect(await service.getAcademicPeriods(group.id)).toEqual([]);
  });

  it("creates subsequent periods with the group's immutable type", async () => {
    const group = await service.createGroup({ name: "2436" });
    await service.createFirstAcademicPeriod(group.id, {
      periodType: "semester",
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-05-31",
    });

    await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-09-01",
      endsOn: "2027-01-31",
      periodType: "quarter",
    } as never);

    expect((await service.getGroup(group.id))?.periodType).toBe("semester");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(2);
  });

  it("rejects duplicate numbers per group but allows them in another group", async () => {
    const firstGroup = await service.createGroup({ name: "A" });
    const secondGroup = await service.createGroup({ name: "B" });
    for (const group of [firstGroup, secondGroup]) {
      await service.createFirstAcademicPeriod(group.id, {
        periodType: "year",
        number: 1,
        startsOn: "2026-01-01",
        endsOn: "2026-12-31",
      });
    }

    await expect(
      service.createAcademicPeriod(firstGroup.id, {
        number: 1,
        startsOn: "2027-01-01",
        endsOn: "2027-12-31",
      }),
    ).rejects.toMatchObject({ code: "duplicate_period_number" });
    expect(await service.getAcademicPeriods(secondGroup.id)).toHaveLength(1);
  });

  it("returns an overlap warning and saves only after explicit confirmation", async () => {
    const group = await service.createGroup({ name: "A" });
    await service.createFirstAcademicPeriod(group.id, {
      periodType: "semester",
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-06-30",
    });

    const warning = await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-06-01",
      endsOn: "2026-12-31",
    });
    expect(warning.kind).toBe("overlap");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(1);

    const saved = await service.createAcademicPeriod(group.id, {
      number: 2,
      startsOn: "2026-06-01",
      endsOn: "2026-12-31",
      forceOverlap: true,
    });
    expect(saved.kind).toBe("saved");
    expect(await service.getAcademicPeriods(group.id)).toHaveLength(2);
  });

  it("updates a period, checks ownership, and excludes itself from overlap", async () => {
    const firstGroup = await service.createGroup({ name: "A" });
    const secondGroup = await service.createGroup({ name: "B" });
    const created = await service.createFirstAcademicPeriod(firstGroup.id, {
      periodType: "trimester",
      number: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-04-30",
    });
    if (created.kind !== "saved") throw new Error("Expected saved period");

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

  it("selects the default period through the service", async () => {
    const group = await service.createGroup({ name: "A" });
    await service.createFirstAcademicPeriod(group.id, {
      periodType: "semester",
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
  });
});

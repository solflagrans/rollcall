import { beforeEach, describe, expect, it } from "vitest";

import type {
  Discipline,
  PeriodDiscipline,
} from "@/features/disciplines/domain/disciplines";
import { DisciplinesServiceError } from "@/features/disciplines/server/errors";
import type { DisciplinesRepository } from "@/features/disciplines/server/repository";
import { DisciplinesService } from "@/features/disciplines/server/service";

const groupId = "00000000-0000-4000-8000-000000000001";
const otherGroupId = "00000000-0000-4000-8000-000000000002";
const firstPeriodId = "00000000-0000-4000-8000-000000000011";
const secondPeriodId = "00000000-0000-4000-8000-000000000012";

class MemoryDisciplinesRepository implements DisciplinesRepository {
  disciplines: Discipline[] = [];
  assignments: PeriodDiscipline[] = [];
  blockedDisciplineIds = new Set<string>();
  blockedAssignments = new Set<string>();
  private sequence = 1;

  async listDisciplines(targetGroupId: string) {
    return this.disciplines.filter(({ groupId }) => groupId === targetGroupId);
  }

  async findDiscipline(targetGroupId: string, reference: string) {
    return this.disciplines.find(
      (discipline) =>
        discipline.groupId === targetGroupId &&
        (discipline.id === reference || discipline.publicId === reference),
    );
  }

  async insertDiscipline(targetGroupId: string, name: string) {
    const sequence = this.sequence++;
    const discipline: Discipline = {
      id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
      publicId: `d${String(sequence).padStart(11, "0")}`,
      groupId: targetGroupId,
      name,
      isArchived: false,
      createdAt: new Date("2026-08-08T00:00:00Z"),
      updatedAt: new Date("2026-08-08T00:00:00Z"),
    };
    this.disciplines.push(discipline);
    return discipline;
  }

  async renameDiscipline(targetGroupId: string, disciplineId: string, name: string) {
    const discipline = await this.findDiscipline(targetGroupId, disciplineId);
    if (!discipline) return undefined;
    discipline.name = name;
    return discipline;
  }

  async setDisciplineArchived(
    targetGroupId: string,
    disciplineId: string,
    isArchived: boolean,
  ) {
    const discipline = await this.findDiscipline(targetGroupId, disciplineId);
    if (!discipline) return undefined;
    discipline.isArchived = isArchived;
    return discipline;
  }

  async hasDisciplineBlockingReferences(disciplineId: string) {
    return (
      this.blockedDisciplineIds.has(disciplineId) ||
      this.assignments.some((assignment) => assignment.disciplineId === disciplineId)
    );
  }

  async deleteDiscipline(targetGroupId: string, disciplineId: string) {
    const discipline = await this.findDiscipline(targetGroupId, disciplineId);
    if (!discipline) return undefined;
    this.disciplines = this.disciplines.filter(({ id }) => id !== discipline.id);
    return discipline;
  }

  async listPeriodDisciplines(targetGroupId: string, periodId: string) {
    const ids = new Set(
      this.assignments
        .filter((assignment) => assignment.periodId === periodId)
        .map(({ disciplineId }) => disciplineId),
    );
    return this.disciplines.filter(
      (discipline) => discipline.groupId === targetGroupId && ids.has(discipline.id),
    );
  }

  async listPeriodDisciplineIds(periodId: string) {
    return this.assignments
      .filter((assignment) => assignment.periodId === periodId)
      .map(({ disciplineId }) => disciplineId);
  }

  async addPeriodDisciplines(periodId: string, disciplineIds: string[]) {
    const created = disciplineIds.map((disciplineId) => ({
      periodId,
      disciplineId,
      createdAt: new Date("2026-08-08T00:00:00Z"),
    }));
    this.assignments.push(...created);
    return created;
  }

  async hasPeriodDisciplineBlockingReferences(
    periodId: string,
    disciplineId: string,
  ) {
    return this.blockedAssignments.has(`${periodId}:${disciplineId}`);
  }

  async removePeriodDiscipline(periodId: string, disciplineId: string) {
    const before = this.assignments.length;
    this.assignments = this.assignments.filter(
      (assignment) =>
        assignment.periodId !== periodId || assignment.disciplineId !== disciplineId,
    );
    return this.assignments.length < before;
  }
}

describe("DisciplinesService", () => {
  let repository: MemoryDisciplinesRepository;
  let service: DisciplinesService;

  beforeEach(() => {
    repository = new MemoryDisciplinesRepository();
    service = new DisciplinesService(repository);
  });

  it("creates a normalized pool without periods and allows equal names in another group", async () => {
    await expect(
      service.createDiscipline(groupId, { name: "  Высшая   математика " }),
    ).resolves.toMatchObject({ name: "Высшая математика", isArchived: false });
    await expect(
      service.createDiscipline(otherGroupId, { name: "высшая математика" }),
    ).resolves.toMatchObject({ groupId: otherGroupId });
  });

  it("rejects case-insensitive duplicates and identifies an archived conflict", async () => {
    const discipline = await service.createDiscipline(groupId, { name: "Физика" });
    await expect(
      service.createDiscipline(groupId, { name: "  физика  " }),
    ).rejects.toMatchObject({ code: "duplicate_name" });

    await service.setDisciplineArchived(groupId, discipline.publicId, true);
    await expect(
      service.createDiscipline(groupId, { name: "ФИЗИКА" }),
    ).rejects.toMatchObject({
      code: "duplicate_archived_name",
      conflictingDiscipline: { id: discipline.id },
    });
  });

  it("renames one entity everywhere and keeps archived assignments visible", async () => {
    const discipline = await service.createDiscipline(groupId, { name: "История" });
    await service.addPeriodDisciplines(groupId, firstPeriodId, {
      disciplineIds: [discipline.publicId],
    });
    await service.renameDiscipline(groupId, discipline.publicId, {
      name: "История России",
    });
    await service.setDisciplineArchived(groupId, discipline.publicId, true);

    await expect(
      service.getPeriodDisciplines(groupId, firstPeriodId),
    ).resolves.toEqual([
      expect.objectContaining({ name: "История России", isArchived: true }),
    ]);
    await expect(
      service.addPeriodDisciplines(groupId, secondPeriodId, {
        disciplineIds: [discipline.publicId],
      }),
    ).rejects.toMatchObject({ code: "archived_not_assignable" });
  });

  it("adds multiple disciplines and reuses one discipline in several periods", async () => {
    const mathematics = await service.createDiscipline(groupId, { name: "Математика" });
    const physics = await service.createDiscipline(groupId, { name: "Физика" });

    await expect(
      service.addPeriodDisciplines(groupId, firstPeriodId, {
        disciplineIds: [mathematics.publicId, physics.publicId],
      }),
    ).resolves.toHaveLength(2);
    await expect(
      service.addPeriodDisciplines(groupId, secondPeriodId, {
        disciplineIds: [mathematics.publicId],
      }),
    ).resolves.toEqual([expect.objectContaining({ id: mathematics.id })]);
  });

  it("blocks physical deletion and unlinking while dependencies exist", async () => {
    const discipline = await service.createDiscipline(groupId, { name: "Химия" });
    await service.addPeriodDisciplines(groupId, firstPeriodId, {
      disciplineIds: [discipline.publicId],
    });

    await expect(
      service.deleteDiscipline(groupId, discipline.publicId),
    ).rejects.toMatchObject({ code: "deletion_blocked" });

    repository.blockedAssignments.add(`${firstPeriodId}:${discipline.id}`);
    await expect(
      service.removePeriodDiscipline(groupId, firstPeriodId, discipline.publicId),
    ).rejects.toMatchObject({ code: "unlink_blocked" });
    repository.blockedAssignments.clear();
    await service.removePeriodDiscipline(groupId, firstPeriodId, discipline.publicId);
    await expect(
      service.deleteDiscipline(groupId, discipline.publicId),
    ).resolves.toMatchObject({ id: discipline.id });
  });

  it("uses typed service errors", () => {
    expect(new DisciplinesServiceError("discipline_not_found")).toBeInstanceOf(Error);
  });
});

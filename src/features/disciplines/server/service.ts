import {
  findDisciplineByNormalizedName,
  type Discipline,
} from "@/features/disciplines/domain/disciplines";
import {
  disciplineFormSchema,
  disciplineSelectionSchema,
  type DisciplineFormValues,
  type DisciplineSelectionInput,
} from "@/features/disciplines/schemas";
import { DisciplinesServiceError } from "@/features/disciplines/server/errors";
import type { DisciplinesRepository } from "@/features/disciplines/server/repository";
import { entityReferenceSchema } from "@/features/groups/schemas";
import { isForeignKeyViolation, isUniqueViolation } from "@/server/db/errors";

export class DisciplinesService {
  constructor(private readonly repository: DisciplinesRepository) {}

  getDisciplines(groupId: string) {
    return this.repository.listDisciplines(groupId);
  }

  async getDiscipline(groupId: string, disciplineReference: string) {
    const reference = entityReferenceSchema.safeParse(disciplineReference);
    if (!reference.success) return undefined;
    return this.repository.findDiscipline(groupId, reference.data);
  }

  async createDiscipline(groupId: string, input: DisciplineFormValues) {
    const { name } = disciplineFormSchema.parse(input);
    const disciplines = await this.repository.listDisciplines(groupId);
    this.assertUniqueName(name, disciplines);

    try {
      return await this.repository.insertDiscipline(groupId, name);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const current = await this.repository.listDisciplines(groupId);
        this.assertUniqueName(name, current);
      }
      throw error;
    }
  }

  async renameDiscipline(
    groupId: string,
    disciplineReference: string,
    input: DisciplineFormValues,
  ) {
    const discipline = await this.requireDiscipline(groupId, disciplineReference);
    const { name } = disciplineFormSchema.parse(input);
    const disciplines = await this.repository.listDisciplines(groupId);
    this.assertUniqueName(name, disciplines, discipline.id);

    try {
      const updated = await this.repository.renameDiscipline(groupId, discipline.id, name);
      if (!updated) throw new DisciplinesServiceError("discipline_not_found");
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const current = await this.repository.listDisciplines(groupId);
        this.assertUniqueName(name, current, discipline.id);
      }
      throw error;
    }
  }

  async setDisciplineArchived(
    groupId: string,
    disciplineReference: string,
    isArchived: boolean,
  ) {
    const discipline = await this.requireDiscipline(groupId, disciplineReference);
    if (discipline.isArchived === isArchived) return discipline;
    const updated = await this.repository.setDisciplineArchived(
      groupId,
      discipline.id,
      isArchived,
    );
    if (!updated) throw new DisciplinesServiceError("discipline_not_found");
    return updated;
  }

  async deleteDiscipline(groupId: string, disciplineReference: string) {
    const discipline = await this.requireDiscipline(groupId, disciplineReference);
    if (await this.repository.hasDisciplineBlockingReferences(discipline.id)) {
      throw new DisciplinesServiceError("deletion_blocked");
    }

    try {
      const deleted = await this.repository.deleteDiscipline(groupId, discipline.id);
      if (!deleted) throw new DisciplinesServiceError("discipline_not_found");
      return deleted;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new DisciplinesServiceError("deletion_blocked");
      }
      throw error;
    }
  }

  getPeriodDisciplines(groupId: string, periodId: string) {
    return this.repository.listPeriodDisciplines(groupId, periodId);
  }

  async addPeriodDisciplines(
    groupId: string,
    periodId: string,
    input: DisciplineSelectionInput,
  ) {
    const { disciplineIds } = disciplineSelectionSchema.parse(input);
    const allDisciplines = await this.repository.listDisciplines(groupId);
    const selected = this.resolveSelectedDisciplines(allDisciplines, disciplineIds);
    const assignedIds = new Set(
      await this.repository.listPeriodDisciplineIds(periodId),
    );
    const newDisciplines = selected.filter(
      (discipline) => !assignedIds.has(discipline.id),
    );
    if (newDisciplines.length === 0) {
      throw new DisciplinesServiceError("already_assigned");
    }

    await this.repository.addPeriodDisciplines(
      periodId,
      newDisciplines.map(({ id }) => id),
    );
    return newDisciplines;
  }

  async removePeriodDiscipline(
    groupId: string,
    periodId: string,
    disciplineReference: string,
  ) {
    const discipline = await this.requireDiscipline(groupId, disciplineReference);
    const assignedIds = await this.repository.listPeriodDisciplineIds(periodId);
    if (!assignedIds.includes(discipline.id)) {
      throw new DisciplinesServiceError("assignment_not_found");
    }
    if (
      await this.repository.hasPeriodDisciplineBlockingReferences(
        periodId,
        discipline.id,
      )
    ) {
      throw new DisciplinesServiceError("unlink_blocked");
    }

    const removed = await this.repository.removePeriodDiscipline(
      periodId,
      discipline.id,
    );
    if (!removed) throw new DisciplinesServiceError("assignment_not_found");
    return discipline;
  }

  private async requireDiscipline(
    groupId: string,
    disciplineReference: string,
  ) {
    const discipline = await this.getDiscipline(groupId, disciplineReference);
    if (!discipline) throw new DisciplinesServiceError("discipline_not_found");
    return discipline;
  }

  private assertUniqueName(
    name: string,
    disciplines: readonly Discipline[],
    excludedDisciplineId?: string,
  ) {
    const conflicting = findDisciplineByNormalizedName(
      disciplines,
      name,
      excludedDisciplineId,
    );
    if (!conflicting) return;
    throw new DisciplinesServiceError(
      conflicting.isArchived ? "duplicate_archived_name" : "duplicate_name",
      conflicting,
    );
  }

  private resolveSelectedDisciplines(
    disciplines: readonly Discipline[],
    references: readonly string[],
  ) {
    const uniqueReferences = [...new Set(references)];
    return uniqueReferences.map((reference) => {
      const discipline = disciplines.find(
        (candidate) =>
          candidate.id === reference || candidate.publicId === reference,
      );
      if (!discipline) throw new DisciplinesServiceError("discipline_not_found");
      if (discipline.isArchived) {
        throw new DisciplinesServiceError("archived_not_assignable");
      }
      return discipline;
    });
  }
}

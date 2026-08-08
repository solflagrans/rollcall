import type {
  Discipline,
  PeriodDiscipline,
} from "@/features/disciplines/domain/disciplines";

export interface DisciplinesRepository {
  listDisciplines(groupId: string): Promise<Discipline[]>;
  findDiscipline(groupId: string, disciplineReference: string): Promise<Discipline | undefined>;
  insertDiscipline(groupId: string, name: string): Promise<Discipline>;
  renameDiscipline(
    groupId: string,
    disciplineId: string,
    name: string,
  ): Promise<Discipline | undefined>;
  setDisciplineArchived(
    groupId: string,
    disciplineId: string,
    isArchived: boolean,
  ): Promise<Discipline | undefined>;
  hasDisciplineBlockingReferences(disciplineId: string): Promise<boolean>;
  deleteDiscipline(groupId: string, disciplineId: string): Promise<Discipline | undefined>;
  listPeriodDisciplines(groupId: string, periodId: string): Promise<Discipline[]>;
  listPeriodDisciplineIds(periodId: string): Promise<string[]>;
  addPeriodDisciplines(
    periodId: string,
    disciplineIds: string[],
  ): Promise<PeriodDiscipline[]>;
  hasPeriodDisciplineBlockingReferences(
    periodId: string,
    disciplineId: string,
  ): Promise<boolean>;
  removePeriodDiscipline(periodId: string, disciplineId: string): Promise<boolean>;
}

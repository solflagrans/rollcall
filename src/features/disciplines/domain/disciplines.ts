export type DisciplineListStatus = "active" | "archived";

export interface Discipline {
  id: string;
  publicId: string;
  groupId: string;
  name: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodDiscipline {
  periodId: string;
  disciplineId: string;
  createdAt: Date;
}

export function findDisciplineByNormalizedName(
  disciplines: readonly Discipline[],
  normalizedName: string,
  excludedDisciplineId?: string,
): Discipline | undefined {
  const comparableName = normalizedName.toLocaleLowerCase("ru");
  return disciplines.find(
    (discipline) =>
      discipline.id !== excludedDisciplineId &&
      discipline.name.toLocaleLowerCase("ru") === comparableName,
  );
}

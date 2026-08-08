import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { requireManagerMembership } from "@/features/auth/server/authorization";
import type {
  DisciplineFormValues,
  DisciplineSelectionInput,
} from "@/features/disciplines/schemas";
import { DrizzleDisciplinesRepository } from "@/features/disciplines/server/drizzle-repository";
import { DisciplinesServiceError } from "@/features/disciplines/server/errors";
import { DisciplinesService } from "@/features/disciplines/server/service";
import {
  getGroup,
  getGroupPeriodContext,
} from "@/features/groups/server/operations";

let service: DisciplinesService | undefined;

function getService() {
  service ??= new DisciplinesService(new DrizzleDisciplinesRepository());
  return service;
}

export function getDisciplinesCacheTag(groupReference: string): string {
  return `group-disciplines:${groupReference}`;
}

async function loadCachedDisciplines(groupId: string) {
  return unstable_cache(
    () => getService().getDisciplines(groupId),
    ["group-disciplines", groupId],
    { revalidate: 15, tags: [getDisciplinesCacheTag(groupId)] },
  )();
}

async function loadCachedPeriodDisciplines(groupId: string, periodId: string) {
  return unstable_cache(
    () => getService().getPeriodDisciplines(groupId, periodId),
    ["period-disciplines", groupId, periodId],
    { revalidate: 15, tags: [getDisciplinesCacheTag(groupId)] },
  )();
}

export const getGroupDisciplinesContext = cache(async (groupReference: string) => {
  const group = await getGroup(groupReference);
  if (!group) return undefined;
  return { group, disciplines: await loadCachedDisciplines(group.id) };
});

export const getPeriodDisciplinesData = cache(
  async (groupId: string, periodId: string) => {
    await requireManagerMembership(groupId);
    const [disciplines, assignedDisciplines] = await Promise.all([
      loadCachedDisciplines(groupId),
      loadCachedPeriodDisciplines(groupId, periodId),
    ]);
    return { disciplines, assignedDisciplines };
  },
);

async function requireGroup(groupReference: string) {
  const group = await getGroup(groupReference);
  if (!group) throw new DisciplinesServiceError("group_not_found");
  return group;
}

async function requirePeriod(groupReference: string, periodReference: string) {
  const context = await getGroupPeriodContext(groupReference, periodReference);
  if (!context) throw new DisciplinesServiceError("group_not_found");
  if (!context.period) throw new DisciplinesServiceError("period_not_found");
  return { group: context.group, period: context.period };
}

export async function createDiscipline(
  groupReference: string,
  input: DisciplineFormValues,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    discipline: await getService().createDiscipline(group.id, input),
  };
}

export async function renameDiscipline(
  groupReference: string,
  disciplineReference: string,
  input: DisciplineFormValues,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    discipline: await getService().renameDiscipline(
      group.id,
      disciplineReference,
      input,
    ),
  };
}

export async function setDisciplineArchived(
  groupReference: string,
  disciplineReference: string,
  isArchived: boolean,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    discipline: await getService().setDisciplineArchived(
      group.id,
      disciplineReference,
      isArchived,
    ),
  };
}

export async function deleteDiscipline(
  groupReference: string,
  disciplineReference: string,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    discipline: await getService().deleteDiscipline(
      group.id,
      disciplineReference,
    ),
  };
}

export async function addPeriodDisciplines(
  groupReference: string,
  periodReference: string,
  input: DisciplineSelectionInput,
) {
  const { group, period } = await requirePeriod(groupReference, periodReference);
  return {
    group,
    period,
    disciplines: await getService().addPeriodDisciplines(
      group.id,
      period.id,
      input,
    ),
  };
}

export async function removePeriodDiscipline(
  groupReference: string,
  periodReference: string,
  disciplineReference: string,
) {
  const { group, period } = await requirePeriod(groupReference, periodReference);
  return {
    group,
    period,
    discipline: await getService().removePeriodDiscipline(
      group.id,
      period.id,
      disciplineReference,
    ),
  };
}

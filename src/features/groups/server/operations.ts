import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { PeriodSummary } from "@/features/groups/domain/periods";
import type {
  CreateAcademicPeriodInput,
  CreateGroupInput,
  UpdateAcademicPeriodInput,
  UpdateGroupInput,
} from "@/features/groups/schemas";
import { DrizzleRollcallRepository } from "@/features/groups/server/drizzle-repository";
import { GroupsService } from "@/features/groups/server/service";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

let service: GroupsService | undefined;

export const GROUPS_CACHE_TAG = "groups:list";

export function getGroupCacheTag(groupReference: string): string {
  return `group:${groupReference}`;
}

function getService() {
  service ??= new GroupsService(new DrizzleRollcallRepository());
  return service;
}

const loadCachedGroups = unstable_cache(
  () => getService().getGroups(),
  ["groups-list"],
  { revalidate: 15, tags: [GROUPS_CACHE_TAG] },
);

async function loadCachedGroupContext(groupReference: string) {
  return unstable_cache(
    () => getService().getGroupContext(groupReference),
    ["group-context", groupReference],
    { revalidate: 15, tags: [getGroupCacheTag(groupReference)] },
  )();
}

async function loadCachedGroupPeriodContext(
  groupReference: string,
  periodReference: string,
) {
  return unstable_cache(
    () => getService().getGroupPeriodContext(groupReference, periodReference),
    ["group-period-context", groupReference, periodReference],
    { revalidate: 15, tags: [getGroupCacheTag(groupReference)] },
  )();
}

export function createGroup(input: CreateGroupInput) {
  return getService().createGroup(input);
}

export function updateGroup(groupId: string, input: UpdateGroupInput) {
  return getService().updateGroup(groupId, input);
}

export const getGroupContext = cache(loadCachedGroupContext);

export const getGroups = cache(loadCachedGroups);

export const getGroup = cache(async (groupId: string) =>
  (await getGroupContext(groupId))?.group,
);

export const getGroupPeriodContext = cache(loadCachedGroupPeriodContext);

export function createAcademicPeriod(groupId: string, input: CreateAcademicPeriodInput) {
  return getService().createAcademicPeriod(groupId, input);
}

export function updateAcademicPeriod(
  groupId: string,
  periodId: string,
  input: UpdateAcademicPeriodInput,
) {
  return getService().updateAcademicPeriod(groupId, periodId, input);
}

export const getAcademicPeriod = cache((groupId: string, periodId: string) =>
  getGroupPeriodContext(groupId, periodId).then((context) => context?.period),
);

export const getAcademicPeriods = cache((groupId: string) =>
  getGroupContext(groupId).then((context) => context?.periods ?? []),
);

export async function getDefaultAcademicPeriod(groupId: string, today?: string) {
  return getService().getDefaultAcademicPeriod(groupId, today ?? (await getUserToday()));
}

export function checkPeriodOverlap(groupId: string, period: PeriodSummary) {
  return getService().checkPeriodOverlap(groupId, period);
}

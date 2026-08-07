import "server-only";

import type { PeriodSummary } from "@/features/groups/domain/periods";
import type {
  CreateAcademicPeriodInput,
  CreateFirstAcademicPeriodInput,
  CreateGroupInput,
  UpdateAcademicPeriodInput,
  UpdateGroupInput,
} from "@/features/groups/schemas";
import { DrizzleRollcallRepository } from "@/features/groups/server/drizzle-repository";
import { GroupsService } from "@/features/groups/server/service";

let service: GroupsService | undefined;

function getService() {
  service ??= new GroupsService(new DrizzleRollcallRepository());
  return service;
}

export function createGroup(input: CreateGroupInput) {
  return getService().createGroup(input);
}

export function updateGroup(groupId: string, input: UpdateGroupInput) {
  return getService().updateGroup(groupId, input);
}

export function getGroup(groupId: string) {
  return getService().getGroup(groupId);
}

export function getGroups() {
  return getService().getGroups();
}

export function createFirstAcademicPeriod(
  groupId: string,
  input: CreateFirstAcademicPeriodInput,
) {
  return getService().createFirstAcademicPeriod(groupId, input);
}

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

export function getAcademicPeriod(groupId: string, periodId: string) {
  return getService().getAcademicPeriod(groupId, periodId);
}

export function getAcademicPeriods(groupId: string) {
  return getService().getAcademicPeriods(groupId);
}

export function getDefaultAcademicPeriod(groupId: string, today?: string) {
  return getService().getDefaultAcademicPeriod(groupId, today);
}

export function checkPeriodOverlap(groupId: string, period: PeriodSummary) {
  return getService().checkPeriodOverlap(groupId, period);
}

import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getGroup } from "@/features/groups/server/operations";
import type { HeadmanInput, MemberInput } from "@/features/members/schemas";
import { DrizzleMembersRepository } from "@/features/members/server/drizzle-repository";
import { MembersServiceError } from "@/features/members/server/errors";
import { MembersService } from "@/features/members/server/service";

let service: MembersService | undefined;

function getService() {
  service ??= new MembersService(new DrizzleMembersRepository());
  return service;
}

export function getMembersCacheTag(groupReference: string): string {
  return `group-members:${groupReference}`;
}

async function loadCachedMembers(groupId: string) {
  return unstable_cache(
    () => getService().getMembers(groupId),
    ["group-members", groupId],
    { revalidate: 15, tags: [getMembersCacheTag(groupId)] },
  )();
}

export const getGroupMembersContext = cache(async (groupReference: string) => {
  const group = await getGroup(groupReference);
  if (!group) return undefined;
  return { group, members: await loadCachedMembers(group.id) };
});

export const getGroupMemberContext = cache(
  async (groupReference: string, memberReference: string) => {
    const context = await getGroupMembersContext(groupReference);
    if (!context) return undefined;
    return {
      ...context,
      member: context.members.find(
        (candidate) =>
          candidate.id === memberReference || candidate.publicId === memberReference,
      ),
    };
  },
);

async function requireGroup(groupReference: string) {
  const group = await getGroup(groupReference);
  if (!group) throw new MembersServiceError("group_not_found");
  return group;
}

export async function createHeadman(groupReference: string, input: HeadmanInput) {
  const group = await requireGroup(groupReference);
  return { group, member: await getService().createHeadman(group.id, input) };
}

export async function createMember(groupReference: string, input: MemberInput) {
  const group = await requireGroup(groupReference);
  return { group, member: await getService().createMember(group.id, input) };
}

export async function updateMember(
  groupReference: string,
  memberReference: string,
  input: MemberInput,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    member: await getService().updateMember(group.id, memberReference, input),
  };
}

export async function setMemberActive(
  groupReference: string,
  memberReference: string,
  isActive: boolean,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    member: await getService().setMemberActive(group.id, memberReference, isActive),
  };
}

export async function deleteMember(
  groupReference: string,
  memberReference: string,
) {
  const group = await requireGroup(groupReference);
  return {
    group,
    member: await getService().deleteMember(group.id, memberReference),
  };
}

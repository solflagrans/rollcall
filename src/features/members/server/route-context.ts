import "server-only";

import { redirect } from "next/navigation";

import {
  getGroupMember,
  getGroupMemberContext,
  getGroupMembersContext,
} from "@/features/members/server/operations";
import { getGroupContext } from "@/features/groups/server/operations";

export async function requireMembersRouteContext(groupReference: string) {
  const context = await getGroupMembersContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  return context;
}

export async function requireMemberRouteContext(
  groupReference: string,
  memberReference: string,
) {
  const context = await getGroupMemberContext(groupReference, memberReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.member) {
    redirect(`/groups/${context.group.publicId}/members?notice=member-not-found`);
  }
  return { ...context, member: context.member };
}

export async function requireStudentMemberRouteContext(
  groupReference: string,
  memberReference: string,
) {
  const context = await getGroupContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  const member = await getGroupMember(context.group.id, memberReference);
  if (!member) {
    redirect(
      `/groups/${context.group.publicId}?notice=student-member-not-found`,
    );
  }
  return { ...context, member };
}

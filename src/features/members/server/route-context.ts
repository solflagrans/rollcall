import "server-only";

import { redirect } from "next/navigation";

import {
  requireManagerRouteAccess,
  requireOwnStudentRouteAccess,
} from "@/features/auth/server/route-context";
import {
  getGroupMemberContext,
  getGroupMembersContext,
  getOwnGroupMember,
} from "@/features/members/server/operations";
import { getOwnStudentGroupContext } from "@/features/groups/server/operations";

export async function requireMembersRouteContext(groupReference: string) {
  await requireManagerRouteAccess(groupReference);
  const context = await getGroupMembersContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  return context;
}

export async function requireMemberRouteContext(
  groupReference: string,
  memberReference: string,
) {
  await requireManagerRouteAccess(groupReference);
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
  await requireOwnStudentRouteAccess(groupReference, memberReference);
  const context = await getOwnStudentGroupContext(groupReference, memberReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  const member = await getOwnGroupMember(groupReference, memberReference);
  if (!member) {
    redirect(
      `/groups/${context.group.publicId}?notice=student-member-not-found`,
    );
  }
  return { ...context, member };
}

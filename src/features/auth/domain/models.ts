import type { GroupMemberRole } from "@/features/members/domain/members";

export interface AuthUserProfile {
  userId: string;
  rollcallId: string;
  firstName: string;
  lastName: string;
}

export type AuthUserProfileInput = Omit<AuthUserProfile, "rollcallId">;

export interface UserMembership {
  group: {
    id: string;
    publicId: string;
    name: string;
  };
  member: {
    id: string;
    publicId: string;
    role: GroupMemberRole;
  };
}

export const managerialRoles = ["headman", "deputy"] as const;

export function isManagerialRole(
  role: GroupMemberRole,
): role is (typeof managerialRoles)[number] {
  return role === "headman" || role === "deputy";
}

export function getMembershipHome(membership: UserMembership): string {
  return isManagerialRole(membership.member.role)
    ? `/groups/${membership.group.publicId}`
    : `/groups/${membership.group.publicId}/student/${membership.member.publicId}/attendance`;
}

export function getAuthenticatedHome(
  memberships: readonly UserMembership[],
): string {
  return memberships.length === 1 && memberships[0]
    ? getMembershipHome(memberships[0])
    : "/groups";
}

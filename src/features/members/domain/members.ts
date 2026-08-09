export const groupMemberRoles = ["headman", "deputy", "student"] as const;
export const editableGroupMemberRoles = ["student", "deputy"] as const;

export type GroupMemberRole = (typeof groupMemberRoles)[number];
export type EditableGroupMemberRole = (typeof editableGroupMemberRoles)[number];
export type MemberListStatus = "active" | "inactive";
export type MemberSortKey = "lastName" | "role";
export type SortDirection = "asc" | "desc";

export interface GroupMember {
  id: string;
  publicId: string;
  groupId: string;
  firstName: string;
  lastName: string;
  role: GroupMemberRole;
  isActive: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberListItem extends GroupMember {
  hasJournalRecords: boolean;
  connectedProfile: {
    firstName: string;
    lastName: string;
    rollcallId: string;
  } | null;
  pendingInvitations: {
    publicId: string;
    method: "rollcall_id" | "link";
    expiresAt: Date;
    targetProfile: {
      firstName: string;
      lastName: string;
      rollcallId: string;
    } | null;
  }[];
}

export function isHeadman<T extends Pick<GroupMember, "role">>(
  member: T,
): member is T & { role: "headman" } {
  return member.role === "headman";
}

export function findHeadman(
  members: readonly GroupMember[],
): GroupMember | undefined {
  return members.find(isHeadman);
}

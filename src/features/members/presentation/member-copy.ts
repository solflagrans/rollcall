import type {
  GroupMemberRole,
  MemberListStatus,
} from "@/features/members/domain/members";

export const memberRoleLabels: Record<GroupMemberRole, string> = {
  headman: "Староста",
  deputy: "Заместитель",
  student: "Студент",
};

export const memberListLabels: Record<MemberListStatus, string> = {
  active: "Активные",
  inactive: "Неактивные",
};

export function formatMemberName(member: {
  firstName: string;
  lastName: string;
}): string {
  return `${member.lastName} ${member.firstName}`;
}

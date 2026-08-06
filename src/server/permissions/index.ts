import type { MembershipRole } from "@/lib/constants";

export type Permission = "group.manage" | "students.manage" | "subjects.manage" | "attendance.manage" | "attendance.readGroup" | "attendance.readOwn";

const rolePermissions: Record<MembershipRole, ReadonlySet<Permission>> = {
  headman: new Set(["group.manage", "students.manage", "subjects.manage", "attendance.manage", "attendance.readGroup", "attendance.readOwn"]),
  deputy: new Set(["group.manage", "students.manage", "subjects.manage", "attendance.manage", "attendance.readGroup", "attendance.readOwn"]),
  student: new Set(["attendance.readOwn"]),
};

export function hasPermission(role: MembershipRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function assertPermission(context: { isActive: boolean; role: MembershipRole; groupId: string }, permission: Permission, requestedGroupId: string) {
  if (!context.isActive) throw new Error("ACCOUNT_INACTIVE");
  if (context.groupId !== requestedGroupId) throw new Error("GROUP_SCOPE_VIOLATION");
  if (!hasPermission(context.role, permission)) throw new Error("FORBIDDEN");
}

import type {
  GroupMember,
  GroupMemberRole,
  MemberSortKey,
  SortDirection,
} from "@/features/members/domain/members";

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
const roleSortOrder: Record<GroupMemberRole, number> = {
  headman: 0,
  deputy: 1,
  student: 2,
};

export function sortMembers<T extends GroupMember>(
  members: readonly T[],
  key: MemberSortKey,
  direction: SortDirection,
): T[] {
  const multiplier = direction === "asc" ? 1 : -1;

  return members.toSorted((left, right) => {
    const primary = compareMemberField(left, right, key);
    if (primary !== 0) return primary * multiplier;

    return (
      collator.compare(left.lastName, right.lastName) ||
      collator.compare(left.firstName, right.firstName) ||
      left.publicId.localeCompare(right.publicId)
    );
  });
}

function compareMemberField(
  left: GroupMember,
  right: GroupMember,
  key: MemberSortKey,
): number {
  if (key === "role") {
    return roleSortOrder[left.role] - roleSortOrder[right.role];
  }

  return (
    collator.compare(left.lastName, right.lastName) ||
    collator.compare(left.firstName, right.firstName)
  );
}

import type {
  GroupMember,
  GroupMemberListItem,
  GroupMemberRole,
} from "@/features/members/domain/members";
import type { NormalizedMemberInput } from "@/features/members/schemas";

export interface MemberWriteValues extends Omit<NormalizedMemberInput, "role"> {
  role: GroupMemberRole;
  isActive: boolean;
  userId: string | null;
}

export interface MembersRepository {
  listMembers(groupId: string): Promise<GroupMemberListItem[]>;
  findMember(groupId: string, memberReference: string): Promise<GroupMember | undefined>;
  insertMember(groupId: string, values: MemberWriteValues): Promise<GroupMember>;
  updateMember(
    groupId: string,
    memberId: string,
    values: NormalizedMemberInput,
  ): Promise<GroupMember | undefined>;
  setMemberActive(
    groupId: string,
    memberId: string,
    isActive: boolean,
  ): Promise<GroupMember | undefined>;
  hasBlockingReferences(memberId: string): Promise<boolean>;
  deleteMember(groupId: string, memberId: string): Promise<GroupMember | undefined>;
}

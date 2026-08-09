import {
  findHeadman,
  isHeadman,
  type GroupMember,
} from "@/features/members/domain/members";
import { memberFormSchema, type MemberInput } from "@/features/members/schemas";
import { MembersServiceError } from "@/features/members/server/errors";
import type { MembersRepository } from "@/features/members/server/repository";
import { entityReferenceSchema } from "@/features/groups/schemas";
import { isForeignKeyViolation } from "@/server/db/errors";

export class MembersService {
  constructor(private readonly repository: MembersRepository) {}

  getMembers(groupId: string) {
    return this.repository.listMembers(groupId);
  }

  async getMember(groupId: string, memberReference: string) {
    const reference = entityReferenceSchema.safeParse(memberReference);
    if (!reference.success) return undefined;
    return this.repository.findMember(groupId, reference.data);
  }

  async createMember(groupId: string, input: MemberInput) {
    const values = memberFormSchema.parse(input);
    const members = await this.repository.listMembers(groupId);
    if (!findHeadman(members)) throw new MembersServiceError("headman_required");
    return this.repository.insertMember(groupId, {
      ...values,
      isActive: true,
      userId: null,
    });
  }

  async updateMember(groupId: string, memberReference: string, input: MemberInput) {
    const member = await this.requireEditableMember(groupId, memberReference);
    const values = memberFormSchema.parse(input);
    const updated = await this.repository.updateMember(groupId, member.id, values);
    if (!updated) throw new MembersServiceError("member_not_found");
    return updated;
  }

  async setMemberActive(
    groupId: string,
    memberReference: string,
    isActive: boolean,
  ) {
    const member = await this.requireEditableMember(groupId, memberReference);
    if (member.isActive === isActive) return member;

    const updated = await this.repository.setMemberActive(groupId, member.id, isActive);
    if (!updated) throw new MembersServiceError("member_not_found");
    return updated;
  }

  async deleteMember(groupId: string, memberReference: string) {
    const member = await this.requireEditableMember(groupId, memberReference);
    if (member.userId) {
      throw new MembersServiceError("deletion_connected");
    }
    if (await this.repository.hasBlockingReferences(member.id)) {
      throw new MembersServiceError("deletion_blocked");
    }

    try {
      const deleted = await this.repository.deleteMember(groupId, member.id);
      if (!deleted) {
        const current = await this.repository.findMember(groupId, member.id);
        if (current?.userId) throw new MembersServiceError("deletion_connected");
        throw new MembersServiceError("member_not_found");
      }
      return deleted;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new MembersServiceError("deletion_blocked");
      }
      throw error;
    }
  }

  private async requireEditableMember(
    groupId: string,
    memberReference: string,
  ): Promise<GroupMember> {
    const member = await this.getMember(groupId, memberReference);
    if (!member) throw new MembersServiceError("member_not_found");
    if (isHeadman(member)) throw new MembersServiceError("headman_protected");
    return member;
  }
}

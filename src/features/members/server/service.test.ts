import { beforeEach, describe, expect, it } from "vitest";

import type { GroupMemberListItem } from "@/features/members/domain/members";
import { MembersServiceError } from "@/features/members/server/errors";
import type {
  MemberWriteValues,
  MembersRepository,
} from "@/features/members/server/repository";
import { MembersService } from "@/features/members/server/service";
import type { NormalizedMemberInput } from "@/features/members/schemas";

const groupId = "00000000-0000-4000-8000-000000000001";

class MemoryMembersRepository implements MembersRepository {
  members: GroupMemberListItem[] = [];
  blockedIds = new Set<string>();
  deleteError?: unknown;
  connectOnDelete = false;
  private sequence = 1;

  async listMembers(targetGroupId: string) {
    return this.members.filter((member) => member.groupId === targetGroupId);
  }

  async findMember(targetGroupId: string, reference: string) {
    return this.members.find(
      (member) =>
        member.groupId === targetGroupId &&
        (member.id === reference || member.publicId === reference),
    );
  }

  async insertMember(targetGroupId: string, values: MemberWriteValues) {
    const id = `00000000-0000-4000-8000-${String(this.sequence).padStart(12, "0")}`;
    const member: GroupMemberListItem = {
      id,
      publicId: `m${String(this.sequence++).padStart(11, "0")}`,
      groupId: targetGroupId,
      ...values,
      hasJournalRecords: false,
      connectedProfile: null,
      pendingInvitations: [],
      createdAt: new Date("2026-08-08T00:00:00Z"),
      updatedAt: new Date("2026-08-08T00:00:00Z"),
    };
    this.members.push(member);
    return member;
  }

  async updateMember(
    targetGroupId: string,
    memberId: string,
    values: NormalizedMemberInput,
  ) {
    const member = await this.findMember(targetGroupId, memberId);
    if (!member) return undefined;
    Object.assign(member, values);
    return member;
  }

  async setMemberActive(targetGroupId: string, memberId: string, isActive: boolean) {
    const member = await this.findMember(targetGroupId, memberId);
    if (!member) return undefined;
    member.isActive = isActive;
    return member;
  }

  async hasBlockingReferences(memberId: string) {
    return this.blockedIds.has(memberId);
  }

  async deleteMember(targetGroupId: string, memberId: string) {
    if (this.deleteError) throw this.deleteError;
    const member = await this.findMember(targetGroupId, memberId);
    if (!member) return undefined;
    if (this.connectOnDelete) {
      member.userId = "concurrent-auth-user";
      return undefined;
    }
    this.members = this.members.filter((candidate) => candidate.id !== member.id);
    return member;
  }
}

describe("MembersService", () => {
  let repository: MemoryMembersRepository;
  let service: MembersService;

  beforeEach(() => {
    repository = new MemoryMembersRepository();
    service = new MembersService(repository);
  });

  const insertHeadman = () =>
    repository.insertMember(groupId, {
      lastName: "Петров",
      firstName: "Пётр",
      role: "headman",
      isActive: true,
      userId: "auth-user-1",
    });

  it("requires one headman before regular members and protects that role", async () => {
    await expect(
      service.createMember(groupId, {
        lastName: "Иванов",
        firstName: "Иван",
        role: "student",
      }),
    ).rejects.toMatchObject({ code: "headman_required" });

    const headman = await insertHeadman();
    expect(headman).toMatchObject({
      lastName: "Петров",
      role: "headman",
      isActive: true,
      userId: "auth-user-1",
    });
    await expect(service.setMemberActive(groupId, headman.publicId, false)).rejects.toMatchObject({
      code: "headman_protected",
    });
    await expect(service.deleteMember(groupId, headman.publicId)).rejects.toMatchObject({
      code: "headman_protected",
    });
  });

  it("edits roles, deactivates without deletion, restores, and deletes mistakes", async () => {
    await insertHeadman();
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      role: "student",
    });

    const deputy = await service.updateMember(groupId, student.publicId, {
      lastName: "Иванов",
      firstName: "Иван",
      role: "deputy",
    });
    expect(deputy.role).toBe("deputy");

    const inactive = await service.setMemberActive(groupId, student.publicId, false);
    expect(inactive).toMatchObject({ id: student.id, isActive: false });
    expect(await service.getMembers(groupId)).toHaveLength(2);

    const active = await service.setMemberActive(groupId, student.publicId, true);
    expect(active).toMatchObject({ id: student.id, isActive: true });

    repository.blockedIds.add(student.id);
    await expect(service.deleteMember(groupId, student.publicId)).rejects.toBeInstanceOf(
      MembersServiceError,
    );
    repository.blockedIds.clear();
    await service.deleteMember(groupId, student.publicId);
    expect(await service.getMembers(groupId)).toHaveLength(1);
  });

  it("translates a concurrent attendance reference into a deletion conflict", async () => {
    await insertHeadman();
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      role: "student",
    });
    repository.deleteError = Object.assign(new Error("foreign key violation"), {
      code: "23503",
    });

    await expect(
      service.deleteMember(groupId, student.publicId),
    ).rejects.toMatchObject({ code: "deletion_blocked" });
  });

  it("does not delete a member with a connected account", async () => {
    await insertHeadman();
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      role: "student",
    });
    student.userId = "auth-user-2";

    await expect(
      service.deleteMember(groupId, student.publicId),
    ).rejects.toMatchObject({ code: "deletion_connected" });
    expect(await service.getMember(groupId, student.publicId)).toBe(student);
  });

  it("does not delete a member connected concurrently", async () => {
    await insertHeadman();
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      role: "student",
    });
    repository.connectOnDelete = true;

    await expect(
      service.deleteMember(groupId, student.publicId),
    ).rejects.toMatchObject({ code: "deletion_connected" });
    expect(await service.getMember(groupId, student.publicId)).toBe(student);
  });
});

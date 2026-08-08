import { beforeEach, describe, expect, it } from "vitest";

import type { GroupMember } from "@/features/members/domain/members";
import { MembersServiceError } from "@/features/members/server/errors";
import type {
  MemberWriteValues,
  MembersRepository,
} from "@/features/members/server/repository";
import { MembersService } from "@/features/members/server/service";
import type { NormalizedMemberInput } from "@/features/members/schemas";

const groupId = "00000000-0000-4000-8000-000000000001";

class MemoryMembersRepository implements MembersRepository {
  members: GroupMember[] = [];
  blockedIds = new Set<string>();
  deleteError?: unknown;
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
    const member: GroupMember = {
      id,
      publicId: `m${String(this.sequence++).padStart(11, "0")}`,
      groupId: targetGroupId,
      ...values,
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

  it("requires one headman before regular members and protects that role", async () => {
    await expect(
      service.createMember(groupId, {
        lastName: "Иванов",
        firstName: "Иван",
        email: "",
        role: "student",
      }),
    ).rejects.toMatchObject({ code: "headman_required" });

    const headman = await service.createHeadman(groupId, {
      lastName: " Петров ",
      firstName: " Пётр ",
      email: "HEADMAN@EXAMPLE.COM",
    });
    expect(headman).toMatchObject({
      lastName: "Петров",
      email: "headman@example.com",
      role: "headman",
      isActive: true,
      userAccountId: null,
    });
    await expect(
      service.createHeadman(groupId, {
        lastName: "Сидоров",
        firstName: "Сидор",
        email: "",
      }),
    ).rejects.toMatchObject({ code: "headman_exists" });
    await expect(service.setMemberActive(groupId, headman.publicId, false)).rejects.toMatchObject({
      code: "headman_protected",
    });
    await expect(service.deleteMember(groupId, headman.publicId)).rejects.toMatchObject({
      code: "headman_protected",
    });
  });

  it("normalizes and enforces unique non-empty email inside the group", async () => {
    await service.createHeadman(groupId, {
      lastName: "Петров",
      firstName: "Пётр",
      email: "",
    });
    await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      email: " USER@EXAMPLE.COM ",
      role: "student",
    });
    await expect(
      service.createMember(groupId, {
        lastName: "Сидорова",
        firstName: "Анна",
        email: "user@example.com",
        role: "deputy",
      }),
    ).rejects.toMatchObject({ code: "duplicate_email" });

    await expect(
      service.createMember(groupId, {
        lastName: "Безпочты",
        firstName: "Один",
        email: "",
        role: "student",
      }),
    ).resolves.toMatchObject({ email: null });
    await expect(
      service.createMember(groupId, {
        lastName: "Безпочты",
        firstName: "Два",
        email: "",
        role: "student",
      }),
    ).resolves.toMatchObject({ email: null });
  });

  it("edits roles, deactivates without deletion, restores, and deletes mistakes", async () => {
    await service.createHeadman(groupId, {
      lastName: "Петров",
      firstName: "Пётр",
      email: "",
    });
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      email: "ivan@example.com",
      role: "student",
    });

    const deputy = await service.updateMember(groupId, student.publicId, {
      lastName: "Иванов",
      firstName: "Иван",
      email: "ivan@example.com",
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
    await service.createHeadman(groupId, {
      lastName: "Петров",
      firstName: "Пётр",
      email: "",
    });
    const student = await service.createMember(groupId, {
      lastName: "Иванов",
      firstName: "Иван",
      email: "",
      role: "student",
    });
    repository.deleteError = Object.assign(new Error("foreign key violation"), {
      code: "23503",
    });

    await expect(
      service.deleteMember(groupId, student.publicId),
    ).rejects.toMatchObject({ code: "deletion_blocked" });
  });
});

import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { entityIdSchema } from "@/features/groups/schemas";
import type {
  MemberWriteValues,
  MembersRepository,
} from "@/features/members/server/repository";
import type { NormalizedMemberInput } from "@/features/members/schemas";
import { getDatabase } from "@/server/db/client";
import { groupMembers, lessonAttendance } from "@/server/db/schema";

export class DrizzleMembersRepository implements MembersRepository {
  private readonly database = getDatabase();

  async listMembers(groupId: string) {
    return this.database
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.lastName), asc(groupMembers.firstName), asc(groupMembers.id));
  }

  async findMember(groupId: string, memberReference: string) {
    const [member] = await this.database
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          entityIdSchema.safeParse(memberReference).success
            ? eq(groupMembers.id, memberReference)
            : eq(groupMembers.publicId, memberReference),
        ),
      )
      .limit(1);
    return member;
  }

  async insertMember(groupId: string, values: MemberWriteValues) {
    const [member] = await this.database
      .insert(groupMembers)
      .values({ groupId, ...values })
      .returning();
    if (!member) throw new Error("Group member insert returned no row");
    return member;
  }

  async updateMember(
    groupId: string,
    memberId: string,
    values: NormalizedMemberInput,
  ) {
    const [member] = await this.database
      .update(groupMembers)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.id, memberId)))
      .returning();
    return member;
  }

  async setMemberActive(groupId: string, memberId: string, isActive: boolean) {
    const [member] = await this.database
      .update(groupMembers)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.id, memberId)))
      .returning();
    return member;
  }

  async hasBlockingReferences(memberId: string) {
    const [attendance] = await this.database
      .select({ lessonId: lessonAttendance.lessonId })
      .from(lessonAttendance)
      .where(eq(lessonAttendance.groupMemberId, memberId))
      .limit(1);
    return Boolean(attendance);
  }

  async deleteMember(groupId: string, memberId: string) {
    const [member] = await this.database
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.id, memberId)))
      .returning();
    return member;
  }
}

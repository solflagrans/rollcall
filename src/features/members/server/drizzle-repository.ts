import "server-only";

import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { entityIdSchema } from "@/features/groups/schemas";
import type {
  MemberWriteValues,
  MembersRepository,
} from "@/features/members/server/repository";
import type { NormalizedMemberInput } from "@/features/members/schemas";
import { getDatabase } from "@/server/db/client";
import { readWithRetry } from "@/server/db/read-retry";
import {
  authUserProfiles,
  groupInvitations,
  groupMembers,
  lessonAttendance,
} from "@/server/db/schema";

const targetProfiles = alias(authUserProfiles, "invitation_target_profiles");

export class DrizzleMembersRepository implements MembersRepository {
  private readonly database = getDatabase();

  async listMembers(groupId: string) {
    const now = new Date();
    const [rows, pendingInvitations, journalReferences] = await Promise.all([
      readWithRetry("members.list", () =>
      this.database
        .select({
          member: groupMembers,
          connectedProfile: {
            firstName: authUserProfiles.firstName,
            lastName: authUserProfiles.lastName,
            rollcallId: authUserProfiles.rollcallId,
          },
        })
        .from(groupMembers)
        .leftJoin(
          authUserProfiles,
          eq(authUserProfiles.userId, groupMembers.userId),
        )
        .where(eq(groupMembers.groupId, groupId))
        .orderBy(
          asc(groupMembers.lastName),
          asc(groupMembers.firstName),
          asc(groupMembers.id),
        )),
      readWithRetry("members.pending-invitations", () =>
        this.database
          .select({
            memberId: groupInvitations.groupMemberId,
            invitation: {
              publicId: groupInvitations.publicId,
              method: groupInvitations.method,
              expiresAt: groupInvitations.expiresAt,
            },
            targetProfile: {
              firstName: targetProfiles.firstName,
              lastName: targetProfiles.lastName,
              rollcallId: targetProfiles.rollcallId,
            },
          })
          .from(groupInvitations)
          .leftJoin(targetProfiles, eq(targetProfiles.userId, groupInvitations.targetUserId))
          .where(
            and(
              eq(groupInvitations.groupId, groupId),
              eq(groupInvitations.status, "pending"),
              gt(groupInvitations.expiresAt, now),
            ),
          )
          .orderBy(asc(groupInvitations.createdAt), asc(groupInvitations.id)),
      ),
      readWithRetry("members.journal-references", () =>
        this.database
          .select({ memberId: lessonAttendance.groupMemberId })
          .from(lessonAttendance)
          .innerJoin(groupMembers, eq(groupMembers.id, lessonAttendance.groupMemberId))
          .where(eq(groupMembers.groupId, groupId)),
      ),
    ]);
    const memberIdsWithJournalRecords = new Set(
      journalReferences.map(({ memberId }) => memberId),
    );
    const invitationsByMember = new Map<string, typeof pendingInvitations>();
    for (const invitation of pendingInvitations) {
      const current = invitationsByMember.get(invitation.memberId) ?? [];
      current.push(invitation);
      invitationsByMember.set(invitation.memberId, current);
    }
    return rows.map(({ member, connectedProfile }) => ({
      ...member,
      hasJournalRecords: memberIdsWithJournalRecords.has(member.id),
      connectedProfile,
      pendingInvitations: (invitationsByMember.get(member.id) ?? []).map(
        ({ invitation, targetProfile }) => ({ ...invitation, targetProfile }),
      ),
    }));
  }

  async findMember(groupId: string, memberReference: string) {
    const [member] = await readWithRetry("members.find", () =>
      this.database
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
        .limit(1),
    );
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
    const [attendance] = await readWithRetry("members.blocking-references", () =>
      this.database
        .select({ lessonId: lessonAttendance.lessonId })
        .from(lessonAttendance)
        .where(eq(lessonAttendance.groupMemberId, memberId))
        .limit(1),
    );
    return Boolean(attendance);
  }

  async deleteMember(groupId: string, memberId: string) {
    const [member] = await this.database
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.id, memberId),
          isNull(groupMembers.userId),
        ),
      )
      .returning();
    return member;
  }
}

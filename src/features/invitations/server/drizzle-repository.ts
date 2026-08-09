import "server-only";

import { and, asc, eq, gt, isNull, lte, ne, notExists, or } from "drizzle-orm";

import type { InvitationsRepository } from "@/features/invitations/server/repository";
import { entityIdSchema } from "@/features/groups/schemas";
import { getDatabase } from "@/server/db/client";
import { readWithRetry } from "@/server/db/read-retry";
import {
  authUserProfiles,
  groupInvitations,
  groupMembers,
  groups,
} from "@/server/db/schema";

export class DrizzleInvitationsRepository implements InvitationsRepository {
  private readonly database = getDatabase();

  async expirePending(now: Date, memberId?: string) {
    await this.database
      .update(groupInvitations)
      .set({ status: "expired", updatedAt: now, respondedAt: now })
      .where(
        and(
          eq(groupInvitations.status, "pending"),
          lte(groupInvitations.expiresAt, now),
          memberId ? eq(groupInvitations.groupMemberId, memberId) : undefined,
        ),
      );
  }

  async findProfileByRollcallId(rollcallId: string) {
    const [profile] = await readWithRetry("invitations.profile", () =>
      this.database
        .select({
          userId: authUserProfiles.userId,
          firstName: authUserProfiles.firstName,
          lastName: authUserProfiles.lastName,
          rollcallId: authUserProfiles.rollcallId,
        })
        .from(authUserProfiles)
        .where(eq(authUserProfiles.rollcallId, rollcallId))
        .limit(1),
    );
    return profile;
  }

  async findMember(groupId: string, memberReference: string) {
    const [member] = await readWithRetry("invitations.member", () =>
      this.database
        .select({
          id: groupMembers.id,
          publicId: groupMembers.publicId,
          groupId: groupMembers.groupId,
          firstName: groupMembers.firstName,
          lastName: groupMembers.lastName,
          isActive: groupMembers.isActive,
          userId: groupMembers.userId,
        })
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

  async userHasMembership(groupId: string, userId: string) {
    const [membership] = await readWithRetry("invitations.membership", () =>
      this.database
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
        .limit(1),
    );
    return Boolean(membership);
  }

  async insertDirectInvitation(input: {
    groupId: string;
    memberId: string;
    invitedByUserId: string;
    targetUserId: string;
    expiresAt: Date;
  }) {
    const [invitation] = await this.database
      .insert(groupInvitations)
      .values({
        groupId: input.groupId,
        groupMemberId: input.memberId,
        invitedByUserId: input.invitedByUserId,
        targetUserId: input.targetUserId,
        method: "rollcall_id",
        expiresAt: input.expiresAt,
      })
      .returning({ publicId: groupInvitations.publicId });
    if (!invitation) throw new Error("Invitation insert returned no row");
    return invitation.publicId;
  }

  async insertLinkInvitation(input: {
    publicId: string;
    groupId: string;
    memberId: string;
    invitedByUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const [invitation] = await this.database
      .insert(groupInvitations)
      .values({
        publicId: input.publicId,
        groupId: input.groupId,
        groupMemberId: input.memberId,
        invitedByUserId: input.invitedByUserId,
        method: "link",
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      })
      .returning({ publicId: groupInvitations.publicId });
    if (!invitation) throw new Error("Invitation insert returned no row");
    return invitation.publicId;
  }

  async listIncoming(userId: string, now: Date) {
    return readWithRetry("invitations.incoming", () =>
      this.database
        .select({
          publicId: groupInvitations.publicId,
          group: { publicId: groups.publicId, name: groups.name },
          member: {
            publicId: groupMembers.publicId,
            firstName: groupMembers.firstName,
            lastName: groupMembers.lastName,
          },
          expiresAt: groupInvitations.expiresAt,
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
        .innerJoin(groupMembers, eq(groupMembers.id, groupInvitations.groupMemberId))
        .where(
          and(
            eq(groupInvitations.targetUserId, userId),
            eq(groupInvitations.status, "pending"),
            gt(groupInvitations.expiresAt, now),
          ),
        )
        .orderBy(asc(groupInvitations.createdAt), asc(groupInvitations.id)),
    );
  }

  private async findCandidate(filter: ReturnType<typeof eq>) {
    const [candidate] = await readWithRetry("invitations.candidate", () =>
      this.database
        .select({
          id: groupInvitations.id,
          publicId: groupInvitations.publicId,
          groupId: groupInvitations.groupId,
          groupPublicId: groups.publicId,
          groupMemberId: groupInvitations.groupMemberId,
          targetUserId: groupInvitations.targetUserId,
          tokenHash: groupInvitations.tokenHash,
          method: groupInvitations.method,
          status: groupInvitations.status,
          expiresAt: groupInvitations.expiresAt,
          memberIsActive: groupMembers.isActive,
          memberUserId: groupMembers.userId,
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
        .innerJoin(groupMembers, eq(groupMembers.id, groupInvitations.groupMemberId))
        .where(filter)
        .limit(1),
    );
    return candidate;
  }

  findByPublicId(publicId: string) {
    return this.findCandidate(eq(groupInvitations.publicId, publicId));
  }

  findByTokenHash(tokenHash: string) {
    return this.findCandidate(eq(groupInvitations.tokenHash, tokenHash));
  }

  async getLinkDetails(tokenHash: string) {
    const [details] = await readWithRetry("invitations.link-details", () =>
      this.database
        .select({
          publicId: groupInvitations.publicId,
          status: groupInvitations.status,
          method: groupInvitations.method,
          expiresAt: groupInvitations.expiresAt,
          group: { publicId: groups.publicId, name: groups.name },
          member: {
            publicId: groupMembers.publicId,
            firstName: groupMembers.firstName,
            lastName: groupMembers.lastName,
            isActive: groupMembers.isActive,
            userId: groupMembers.userId,
          },
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
        .innerJoin(groupMembers, eq(groupMembers.id, groupInvitations.groupMemberId))
        .where(eq(groupInvitations.tokenHash, tokenHash))
        .limit(1),
    );
    return details;
  }

  async accept(candidate: Parameters<InvitationsRepository["accept"]>[0], userId: string, now: Date) {
    const memberUpdate = this.database
      .update(groupMembers)
      .set({ userId, updatedAt: now })
      .where(
        and(
          eq(groupMembers.id, candidate.groupMemberId),
          eq(groupMembers.groupId, candidate.groupId),
          eq(groupMembers.isActive, true),
          isNull(groupMembers.userId),
          notExists(
            this.database
              .select({ id: groupMembers.id })
              .from(groupMembers)
              .where(
                and(
                  eq(groupMembers.groupId, candidate.groupId),
                  eq(groupMembers.userId, userId),
                  ne(groupMembers.id, candidate.groupMemberId),
                ),
              ),
          ),
          notExists(
            this.database
              .select({ id: groupInvitations.id })
              .from(groupInvitations)
              .where(
                and(
                  eq(groupInvitations.id, candidate.id),
                  or(
                    ne(groupInvitations.status, "pending"),
                    lte(groupInvitations.expiresAt, now),
                    candidate.targetUserId
                      ? ne(groupInvitations.targetUserId, userId)
                      : undefined,
                  ),
                ),
              ),
          ),
        ),
      )
      .returning({ id: groupMembers.id });
    const invitationUpdate = this.database
      .update(groupInvitations)
      .set({
        status: "accepted",
        targetUserId: userId,
        updatedAt: now,
        respondedAt: now,
      })
      .where(
        and(
          eq(groupInvitations.id, candidate.id),
          eq(groupInvitations.status, "pending"),
          gt(groupInvitations.expiresAt, now),
          or(isNull(groupInvitations.targetUserId), eq(groupInvitations.targetUserId, userId)),
          notExists(
            this.database
              .select({ id: groupMembers.id })
              .from(groupMembers)
              .where(
                and(
                  eq(groupMembers.id, candidate.groupMemberId),
                  or(isNull(groupMembers.userId), ne(groupMembers.userId, userId)),
                ),
              ),
          ),
        ),
      )
      .returning({ id: groupInvitations.id });
    const revokeSiblingInvitations = this.database
      .update(groupInvitations)
      .set({ status: "revoked", updatedAt: now, respondedAt: now })
      .where(
        and(
          eq(groupInvitations.groupMemberId, candidate.groupMemberId),
          ne(groupInvitations.id, candidate.id),
          eq(groupInvitations.status, "pending"),
          notExists(
            this.database
              .select({ id: groupMembers.id })
              .from(groupMembers)
              .where(
                and(
                  eq(groupMembers.id, candidate.groupMemberId),
                  or(isNull(groupMembers.userId), ne(groupMembers.userId, userId)),
                ),
              ),
          ),
        ),
      );
    const [, acceptedInvitations] = await this.database.batch([
      memberUpdate,
      invitationUpdate,
      revokeSiblingInvitations,
    ]);
    return acceptedInvitations.length === 1;
  }

  async decline(publicId: string, userId: string, now: Date) {
    const [invitation] = await this.database
      .update(groupInvitations)
      .set({ status: "declined", updatedAt: now, respondedAt: now })
      .where(
        and(
          eq(groupInvitations.publicId, publicId),
          eq(groupInvitations.targetUserId, userId),
          eq(groupInvitations.status, "pending"),
          gt(groupInvitations.expiresAt, now),
        ),
      )
      .returning({ id: groupInvitations.id });
    return Boolean(invitation);
  }

  async revoke(groupId: string, publicId: string, now: Date) {
    const [invitation] = await this.database
      .update(groupInvitations)
      .set({ status: "revoked", updatedAt: now, respondedAt: now })
      .where(
        and(
          eq(groupInvitations.groupId, groupId),
          eq(groupInvitations.publicId, publicId),
          eq(groupInvitations.status, "pending"),
        ),
      )
      .returning({ id: groupInvitations.id });
    return Boolean(invitation);
  }
}

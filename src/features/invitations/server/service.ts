import { createHash, createHmac, randomBytes } from "node:crypto";

import type { InvitationProfile } from "@/features/invitations/domain/models";
import { InvitationServiceError } from "@/features/invitations/server/errors";
import type {
  InvitationCandidate,
  InvitationMember,
  InvitationsRepository,
} from "@/features/invitations/server/repository";
import {
  invitationReferenceSchema,
  inviteTokenSchema,
  rollcallIdSchema,
} from "@/features/invitations/schemas";
import { entityReferenceSchema } from "@/features/groups/schemas";
import { isUniqueViolation } from "@/server/db/errors";

const DIRECT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LINK_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createLinkToken(publicId: string, secret: string) {
  return createHmac("sha256", secret).update(publicId).digest("base64url");
}

export class InvitationsService {
  constructor(
    private readonly repository: InvitationsRepository,
    private readonly linkSecret: string,
  ) {}

  private async requireInvitableMember(groupId: string, memberReference: string) {
    const reference = entityReferenceSchema.parse(memberReference);
    const member = await this.repository.findMember(groupId, reference);
    if (!member) throw new InvitationServiceError("member_not_found");
    if (!member.isActive) throw new InvitationServiceError("member_inactive");
    if (member.userId) throw new InvitationServiceError("member_connected");
    return member;
  }

  private async assertUserCanJoin(member: InvitationMember, userId: string) {
    if (await this.repository.userHasMembership(member.groupId, userId)) {
      throw new InvitationServiceError("already_group_member");
    }
  }

  async lookupProfile(
    groupId: string,
    memberReference: string,
    rollcallIdInput: string,
  ): Promise<InvitationProfile> {
    const member = await this.requireInvitableMember(groupId, memberReference);
    const rollcallId = rollcallIdSchema.parse(rollcallIdInput);
    const profile = await this.repository.findProfileByRollcallId(rollcallId);
    if (!profile) throw new InvitationServiceError("profile_not_found");
    await this.assertUserCanJoin(member, profile.userId);
    return profile;
  }

  async createDirect(input: {
    groupId: string;
    memberReference: string;
    invitedByUserId: string;
    rollcallId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const member = await this.requireInvitableMember(input.groupId, input.memberReference);
    const profile = await this.lookupProfile(
      input.groupId,
      member.id,
      input.rollcallId,
    );
    await this.repository.expirePending(now, member.id);
    try {
      const publicId = await this.repository.insertDirectInvitation({
        groupId: input.groupId,
        memberId: member.id,
        invitedByUserId: input.invitedByUserId,
        targetUserId: profile.userId,
        expiresAt: new Date(now.getTime() + DIRECT_INVITATION_TTL_MS),
      });
      return { publicId, profile };
    } catch (error) {
      if (isUniqueViolation(error)) throw new InvitationServiceError("pending_exists");
      throw error;
    }
  }

  async createLink(input: {
    groupId: string;
    memberReference: string;
    invitedByUserId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const member = await this.requireInvitableMember(input.groupId, input.memberReference);
    await this.repository.expirePending(now, member.id);
    const publicId = randomBytes(9).toString("base64url");
    const token = createLinkToken(publicId, this.linkSecret);
    const expiresAt = new Date(now.getTime() + LINK_INVITATION_TTL_MS);
    try {
      await this.repository.insertLinkInvitation({
        publicId,
        groupId: input.groupId,
        memberId: member.id,
        invitedByUserId: input.invitedByUserId,
        tokenHash: hashInviteToken(token),
        expiresAt,
      });
      return { publicId, token, expiresAt };
    } catch (error) {
      if (isUniqueViolation(error)) throw new InvitationServiceError("pending_exists");
      throw error;
    }
  }

  async getOutgoingLink(groupId: string, publicIdInput: string, now = new Date()) {
    const publicId = invitationReferenceSchema.parse(publicIdInput);
    await this.repository.expirePending(now);
    const invitation = await this.repository.findByPublicId(publicId);
    if (!invitation || invitation.groupId !== groupId || invitation.method !== "link") {
      throw new InvitationServiceError("invitation_not_found");
    }
    this.assertPendingAndCurrent(invitation, now);
    if (!invitation.memberIsActive) {
      throw new InvitationServiceError("member_inactive");
    }
    if (invitation.memberUserId) {
      throw new InvitationServiceError("member_connected");
    }
    const token = createLinkToken(publicId, this.linkSecret);
    if (invitation.tokenHash !== hashInviteToken(token)) {
      throw new InvitationServiceError("link_unavailable");
    }
    return { token, expiresAt: invitation.expiresAt };
  }

  async listIncoming(userId: string, now = new Date()) {
    await this.repository.expirePending(now);
    return this.repository.listIncoming(userId, now);
  }

  async getLinkDetails(tokenInput: string, now = new Date()) {
    const token = inviteTokenSchema.parse(tokenInput);
    await this.repository.expirePending(now);
    const details = await this.repository.getLinkDetails(hashInviteToken(token));
    if (!details || details.method !== "link") {
      throw new InvitationServiceError("invitation_not_found");
    }
    return details;
  }

  async acceptDirect(publicIdInput: string, userId: string, now = new Date()) {
    const publicId = invitationReferenceSchema.parse(publicIdInput);
    const candidate = await this.repository.findByPublicId(publicId);
    if (!candidate || candidate.method !== "rollcall_id") {
      throw new InvitationServiceError("invitation_not_found");
    }
    return this.acceptCandidate(candidate, userId, now);
  }

  async acceptLink(tokenInput: string, userId: string, now = new Date()) {
    const token = inviteTokenSchema.parse(tokenInput);
    const candidate = await this.repository.findByTokenHash(hashInviteToken(token));
    if (!candidate || candidate.method !== "link") {
      throw new InvitationServiceError("invitation_not_found");
    }
    return this.acceptCandidate(candidate, userId, now);
  }

  private async acceptCandidate(
    candidate: InvitationCandidate,
    userId: string,
    now: Date,
  ) {
    this.assertCandidateState(candidate, userId, now);
    if (await this.repository.userHasMembership(candidate.groupId, userId)) {
      throw new InvitationServiceError("already_group_member");
    }
    try {
      if (await this.repository.accept(candidate, userId, now)) {
        return {
          groupId: candidate.groupId,
          groupPublicId: candidate.groupPublicId,
        };
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new InvitationServiceError("already_group_member");
      }
      throw error;
    }

    const current = await this.repository.findByPublicId(candidate.publicId);
    if (!current) throw new InvitationServiceError("invitation_not_found");
    this.assertCandidateState(current, userId, now);
    if (await this.repository.userHasMembership(candidate.groupId, userId)) {
      throw new InvitationServiceError("already_group_member");
    }
    throw new InvitationServiceError("member_connected");
  }

  private assertCandidateState(candidate: InvitationCandidate, userId: string, now: Date) {
    this.assertPendingAndCurrent(candidate, now);
    if (candidate.targetUserId && candidate.targetUserId !== userId) {
      throw new InvitationServiceError("invitation_not_for_user");
    }
    if (!candidate.memberIsActive) {
      throw new InvitationServiceError("member_inactive");
    }
    if (candidate.memberUserId) {
      throw new InvitationServiceError("member_connected");
    }
  }

  private assertPendingAndCurrent(candidate: InvitationCandidate, now: Date) {
    if (candidate.status !== "pending") {
      throw new InvitationServiceError("invitation_not_pending");
    }
    if (candidate.expiresAt <= now) {
      throw new InvitationServiceError("invitation_expired");
    }
  }

  async decline(publicIdInput: string, userId: string, now = new Date()) {
    const publicId = invitationReferenceSchema.parse(publicIdInput);
    const invitation = await this.repository.findByPublicId(publicId);
    if (!invitation) throw new InvitationServiceError("invitation_not_found");
    this.assertCandidateState(invitation, userId, now);
    if (await this.repository.decline(publicId, userId, now)) {
      return {
        groupId: invitation.groupId,
        groupPublicId: invitation.groupPublicId,
      };
    }
    throw new InvitationServiceError("invitation_not_for_user");
  }

  async revoke(groupId: string, publicIdInput: string, now = new Date()) {
    const publicId = invitationReferenceSchema.parse(publicIdInput);
    if (await this.repository.revoke(groupId, publicId, now)) return;
    throw new InvitationServiceError("invitation_not_pending");
  }
}

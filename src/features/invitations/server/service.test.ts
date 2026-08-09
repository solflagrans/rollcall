import { beforeEach, describe, expect, it } from "vitest";

import type {
  IncomingInvitation,
  InvitationProfile,
  InviteLinkDetails,
} from "@/features/invitations/domain/models";
import type {
  InvitationCandidate,
  InvitationMember,
  InvitationsRepository,
} from "@/features/invitations/server/repository";
import {
  hashInviteToken,
  InvitationsService,
} from "@/features/invitations/server/service";

const now = new Date("2026-08-09T12:00:00Z");
const groupId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";

class MemoryInvitationsRepository implements InvitationsRepository {
  member: InvitationMember = {
    id: memberId,
    publicId: "member000002",
    groupId,
    firstName: "Иван",
    lastName: "Иванов",
    isActive: true,
    userId: null,
  };
  profile: InvitationProfile = {
    userId: "auth-user-2",
    firstName: "Иван",
    lastName: "Аккаунтов",
    rollcallId: "rc_AbCdEfGhIjKlMnOp",
  };
  memberships = new Set<string>();
  invitations = new Map<string, InvitationCandidate>();
  tokenHashes = new Map<string, string>();
  sequence = 1;

  async expirePending(targetNow: Date, targetMemberId?: string) {
    for (const invitation of this.invitations.values()) {
      if (
        invitation.status === "pending" &&
        invitation.expiresAt <= targetNow &&
        (!targetMemberId || invitation.groupMemberId === targetMemberId)
      ) invitation.status = "expired";
    }
  }

  async findProfileByRollcallId(rollcallId: string) {
    return rollcallId === this.profile.rollcallId ? this.profile : undefined;
  }

  async findMember(targetGroupId: string, reference: string) {
    return targetGroupId === groupId &&
      (reference === this.member.id || reference === this.member.publicId)
      ? this.member
      : undefined;
  }

  async userHasMembership(targetGroupId: string, userId: string) {
    return this.memberships.has(`${targetGroupId}:${userId}`);
  }

  private insert(method: "rollcall_id" | "link", input: {
    publicId?: string;
    groupId: string;
    memberId: string;
    targetUserId?: string;
    tokenHash?: string;
    expiresAt: Date;
  }) {
    const publicId = input.publicId ?? `invite${String(this.sequence++).padStart(6, "0")}`;
    const candidate: InvitationCandidate = {
      id: `invitation-${publicId}`,
      publicId,
      groupId: input.groupId,
      groupPublicId: "group0000001",
      groupMemberId: input.memberId,
      targetUserId: input.targetUserId ?? null,
      tokenHash: input.tokenHash ?? null,
      method,
      status: "pending",
      expiresAt: input.expiresAt,
      memberIsActive: this.member.isActive,
      memberUserId: this.member.userId,
    };
    this.invitations.set(publicId, candidate);
    if (input.tokenHash) this.tokenHashes.set(input.tokenHash, publicId);
    return publicId;
  }

  async insertDirectInvitation(input: Parameters<InvitationsRepository["insertDirectInvitation"]>[0]) {
    return this.insert("rollcall_id", {
      groupId: input.groupId,
      memberId: input.memberId,
      targetUserId: input.targetUserId,
      expiresAt: input.expiresAt,
    });
  }

  async insertLinkInvitation(input: Parameters<InvitationsRepository["insertLinkInvitation"]>[0]) {
    this.insert("link", {
      publicId: input.publicId,
      groupId: input.groupId,
      memberId: input.memberId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    return input.publicId;
  }

  async listIncoming(): Promise<IncomingInvitation[]> {
    return [];
  }

  async findByPublicId(publicId: string) {
    const invitation = this.invitations.get(publicId);
    if (invitation) {
      invitation.memberIsActive = this.member.isActive;
      invitation.memberUserId = this.member.userId;
    }
    return invitation;
  }

  async findByTokenHash(tokenHash: string) {
    const publicId = this.tokenHashes.get(tokenHash);
    return publicId ? this.findByPublicId(publicId) : undefined;
  }

  async getLinkDetails(tokenHash: string): Promise<InviteLinkDetails | undefined> {
    const invitation = await this.findByTokenHash(tokenHash);
    if (!invitation) return undefined;
    return {
      publicId: invitation.publicId,
      status: invitation.status,
      method: invitation.method,
      expiresAt: invitation.expiresAt,
      group: { publicId: invitation.groupPublicId, name: "2436" },
      member: {
        publicId: this.member.publicId,
        firstName: this.member.firstName,
        lastName: this.member.lastName,
        isActive: this.member.isActive,
        userId: this.member.userId,
      },
    };
  }

  async accept(candidate: InvitationCandidate, userId: string) {
    if (candidate.status !== "pending" || this.member.userId) return false;
    this.member.userId = userId;
    candidate.memberUserId = userId;
    candidate.targetUserId = userId;
    candidate.status = "accepted";
    this.memberships.add(`${candidate.groupId}:${userId}`);
    return true;
  }

  async decline(publicId: string, userId: string) {
    const invitation = this.invitations.get(publicId);
    if (!invitation || invitation.targetUserId !== userId || invitation.status !== "pending") return false;
    invitation.status = "declined";
    return true;
  }

  async revoke(group: string, publicId: string) {
    const invitation = this.invitations.get(publicId);
    if (!invitation || invitation.groupId !== group || invitation.status !== "pending") return false;
    invitation.status = "revoked";
    return true;
  }
}

describe("InvitationsService", () => {
  let repository: MemoryInvitationsRepository;
  let service: InvitationsService;

  beforeEach(() => {
    repository = new MemoryInvitationsRepository();
    service = new InvitationsService(repository, "test-link-secret");
  });

  it("creates an addressed invitation without connecting the member", async () => {
    const result = await service.createDirect({
      groupId,
      memberReference: repository.member.publicId,
      invitedByUserId: "auth-manager",
      rollcallId: repository.profile.rollcallId,
      now,
    });

    expect(result.profile).toEqual(repository.profile);
    expect(repository.member.userId).toBeNull();
    expect(repository.invitations.get(result.publicId)).toMatchObject({
      status: "pending",
      targetUserId: repository.profile.userId,
      groupMemberId: memberId,
    });
  });

  it("connects only the addressed user after explicit acceptance", async () => {
    const invitation = await service.createDirect({
      groupId,
      memberReference: repository.member.publicId,
      invitedByUserId: "auth-manager",
      rollcallId: repository.profile.rollcallId,
      now,
    });

    await expect(
      service.acceptDirect(invitation.publicId, "another-user", now),
    ).rejects.toMatchObject({ code: "invitation_not_for_user" });
    expect(repository.member.userId).toBeNull();

    await expect(
      service.acceptDirect(invitation.publicId, repository.profile.userId, now),
    ).resolves.toEqual({ groupId, groupPublicId: "group0000001" });
    expect(repository.member.userId).toBe(repository.profile.userId);
  });

  it("keeps the member unchanged when the invitation is declined", async () => {
    const invitation = await service.createDirect({
      groupId,
      memberReference: repository.member.publicId,
      invitedByUserId: "auth-manager",
      rollcallId: repository.profile.rollcallId,
      now,
    });
    await service.decline(invitation.publicId, repository.profile.userId, now);
    expect(repository.member.userId).toBeNull();
    expect(repository.invitations.get(invitation.publicId)?.status).toBe("declined");
  });

  it("stores only the link hash and blocks acceptance after the member changes", async () => {
    const invitation = await service.createLink({
      groupId,
      memberReference: repository.member.publicId,
      invitedByUserId: "auth-manager",
      now,
    });
    expect(repository.tokenHashes.has(hashInviteToken(invitation.token))).toBe(true);
    expect([...repository.tokenHashes.keys()]).not.toContain(invitation.token);
    expect(invitation.expiresAt).toEqual(new Date("2026-08-10T12:00:00Z"));
    await expect(
      service.getOutgoingLink(groupId, invitation.publicId, now),
    ).resolves.toMatchObject({ token: invitation.token, expiresAt: invitation.expiresAt });

    repository.member.isActive = false;
    await expect(
      service.acceptLink(invitation.token, repository.profile.userId, now),
    ).rejects.toMatchObject({ code: "member_inactive" });
    expect(repository.member.userId).toBeNull();
  });
});

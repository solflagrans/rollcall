import type {
  IncomingInvitation,
  InvitationProfile,
  InviteLinkDetails,
  InvitationMethod,
  InvitationStatus,
} from "@/features/invitations/domain/models";

export interface InvitationCandidate {
  id: string;
  publicId: string;
  groupId: string;
  groupPublicId: string;
  groupMemberId: string;
  targetUserId: string | null;
  tokenHash: string | null;
  method: InvitationMethod;
  status: InvitationStatus;
  expiresAt: Date;
  memberIsActive: boolean;
  memberUserId: string | null;
}

export interface InvitationMember {
  id: string;
  publicId: string;
  groupId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  userId: string | null;
}

export interface InvitationsRepository {
  expirePending(now: Date, memberId?: string): Promise<void>;
  findProfileByRollcallId(rollcallId: string): Promise<InvitationProfile | undefined>;
  findMember(groupId: string, memberReference: string): Promise<InvitationMember | undefined>;
  userHasMembership(groupId: string, userId: string): Promise<boolean>;
  insertDirectInvitation(input: {
    groupId: string;
    memberId: string;
    invitedByUserId: string;
    targetUserId: string;
    expiresAt: Date;
  }): Promise<string>;
  insertLinkInvitation(input: {
    publicId: string;
    groupId: string;
    memberId: string;
    invitedByUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string>;
  listIncoming(userId: string, now: Date): Promise<IncomingInvitation[]>;
  findByPublicId(publicId: string): Promise<InvitationCandidate | undefined>;
  findByTokenHash(tokenHash: string): Promise<InvitationCandidate | undefined>;
  getLinkDetails(tokenHash: string): Promise<InviteLinkDetails | undefined>;
  accept(candidate: InvitationCandidate, userId: string, now: Date): Promise<boolean>;
  decline(publicId: string, userId: string, now: Date): Promise<boolean>;
  revoke(groupId: string, publicId: string, now: Date): Promise<boolean>;
}

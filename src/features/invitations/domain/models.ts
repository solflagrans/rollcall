export type InvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "revoked";
export type InvitationMethod = "rollcall_id" | "link";

export interface InvitationProfile {
  userId: string;
  firstName: string;
  lastName: string;
  rollcallId: string;
}

export type PublicInvitationProfile = Omit<InvitationProfile, "userId">;

export interface IncomingInvitation {
  publicId: string;
  group: { publicId: string; name: string };
  member: { publicId: string; firstName: string; lastName: string };
  expiresAt: Date;
}

export interface InviteLinkDetails {
  publicId: string;
  status: InvitationStatus;
  method: InvitationMethod;
  expiresAt: Date;
  group: { publicId: string; name: string };
  member: {
    publicId: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    userId: string | null;
  };
}

import "server-only";

import { cache } from "react";

import {
  requireAuthUser,
  requireManagerMembership,
} from "@/features/auth/server/authorization";
import { getAuthEnv } from "@/features/auth/server/neon-auth";
import { DrizzleInvitationsRepository } from "@/features/invitations/server/drizzle-repository";
import { InvitationsService } from "@/features/invitations/server/service";

let service: InvitationsService | undefined;

function getService() {
  service ??= new InvitationsService(
    new DrizzleInvitationsRepository(),
    getAuthEnv().NEON_AUTH_COOKIE_SECRET,
  );
  return service;
}

export async function lookupInvitationProfile(
  groupReference: string,
  memberReference: string,
  rollcallId: string,
) {
  const { membership } = await requireManagerMembership(groupReference);
  return getService().lookupProfile(
    membership.group.id,
    memberReference,
    rollcallId,
  );
}

export async function createDirectInvitation(
  groupReference: string,
  memberReference: string,
  rollcallId: string,
) {
  const { user, membership } = await requireManagerMembership(groupReference);
  const invitation = await getService().createDirect({
    groupId: membership.group.id,
    memberReference,
    invitedByUserId: user.id,
    rollcallId,
  });
  return { group: membership.group, ...invitation };
}

export async function createLinkInvitation(
  groupReference: string,
  memberReference: string,
) {
  const { user, membership } = await requireManagerMembership(groupReference);
  const invitation = await getService().createLink({
    groupId: membership.group.id,
    memberReference,
    invitedByUserId: user.id,
  });
  return { group: membership.group, ...invitation };
}

export async function getOutgoingLinkInvitation(
  groupReference: string,
  invitationReference: string,
) {
  const { membership } = await requireManagerMembership(groupReference);
  return getService().getOutgoingLink(membership.group.id, invitationReference);
}

export async function revokeInvitation(
  groupReference: string,
  invitationReference: string,
) {
  const { membership } = await requireManagerMembership(groupReference);
  await getService().revoke(membership.group.id, invitationReference);
  return membership.group;
}

export const listIncomingInvitations = cache(async () => {
  const user = await requireAuthUser();
  return getService().listIncoming(user.id);
});

export async function acceptDirectInvitation(invitationReference: string) {
  const user = await requireAuthUser();
  return getService().acceptDirect(invitationReference, user.id);
}

export async function declineInvitation(invitationReference: string) {
  const user = await requireAuthUser();
  return getService().decline(invitationReference, user.id);
}

export const getInviteLinkDetails = cache((token: string) =>
  getService().getLinkDetails(token),
);

export async function acceptLinkInvitation(token: string) {
  const user = await requireAuthUser();
  return getService().acceptLink(token, user.id);
}

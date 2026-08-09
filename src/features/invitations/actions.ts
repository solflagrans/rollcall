"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ZodError } from "zod";

import { getAuthorizationErrorMessage } from "@/features/auth/server/authorization";
import type { PublicInvitationProfile } from "@/features/invitations/domain/models";
import { InvitationServiceError } from "@/features/invitations/server/errors";
import {
  acceptDirectInvitation,
  acceptLinkInvitation,
  createDirectInvitation,
  createLinkInvitation,
  declineInvitation,
  getOutgoingLinkInvitation,
  lookupInvitationProfile,
  revokeInvitation,
} from "@/features/invitations/server/operations";
import { getMembersCacheTag } from "@/features/members/server/operations";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";

export type InvitationActionResult =
  | { status: "success"; message: string; redirectTo?: string }
  | { status: "error"; formError: string };

export type InvitationLookupResult =
  | { status: "success"; profile: PublicInvitationProfile }
  | { status: "error"; formError: string };

export type LinkInvitationActionResult = InvitationActionResult & {
  invitePath?: string;
  expiresAt?: string;
};

function invitationError(error: unknown): { status: "error"; formError: string } {
  const authorizationMessage = getAuthorizationErrorMessage(error);
  if (authorizationMessage) return { status: "error", formError: authorizationMessage };
  if (error instanceof ZodError) {
    return { status: "error", formError: error.issues[0]?.message ?? "Проверьте данные." };
  }
  if (error instanceof InvitationServiceError) {
    const messages: Record<InvitationServiceError["code"], string> = {
      member_not_found: "Участник больше не существует.",
      member_inactive: "Приглашение доступно только для активного участника.",
      member_connected: "К этой записи уже подключён другой аккаунт.",
      profile_not_found: "Пользователь с таким Rollcall ID не найден.",
      already_group_member: "Этот аккаунт уже связан с другим участником данной группы.",
      pending_exists: "Для участника уже есть приглашение, ожидающее ответа.",
      invitation_not_found: "Приглашение не найдено или ссылка недействительна.",
      invitation_not_pending: "Это приглашение уже завершено и не может быть изменено.",
      invitation_expired: "Срок действия приглашения истёк.",
      link_unavailable: "Эта ссылка создана в старом формате. Отзовите её и создайте новую.",
      invitation_not_for_user: "Это приглашение адресовано другому пользователю.",
    };
    return { status: "error", formError: messages[error.code] };
  }
  logUnexpectedOperationError("invitations", error);
  return { status: "error", formError: "Не удалось выполнить действие. Повторите попытку." };
}

function invalidateInvitationViews(group?: { id: string; publicId: string }) {
  revalidatePath("/groups");
  if (group) {
    updateTag(getMembersCacheTag(group.id));
    updateTag(getMembersCacheTag(group.publicId));
    revalidatePath(`/groups/${group.publicId}/members`);
  }
}

export async function lookupInvitationProfileAction(
  groupReference: string,
  memberReference: string,
  rollcallId: string,
): Promise<InvitationLookupResult> {
  try {
    const profile = await lookupInvitationProfile(
      groupReference,
      memberReference,
      rollcallId,
    );
    return {
      status: "success",
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        rollcallId: profile.rollcallId,
      },
    };
  } catch (error) {
    return invitationError(error);
  }
}

export async function createDirectInvitationAction(
  groupReference: string,
  memberReference: string,
  rollcallId: string,
): Promise<InvitationActionResult> {
  try {
    const result = await createDirectInvitation(groupReference, memberReference, rollcallId);
    invalidateInvitationViews(result.group);
    return { status: "success", message: "Приглашение отправлено." };
  } catch (error) {
    return invitationError(error);
  }
}

export async function createLinkInvitationAction(
  groupReference: string,
  memberReference: string,
): Promise<LinkInvitationActionResult> {
  try {
    const invitation = await createLinkInvitation(groupReference, memberReference);
    invalidateInvitationViews(invitation.group);
    return {
      status: "success",
      message: "Персональная ссылка создана.",
      invitePath: `/invite/${invitation.token}`,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  } catch (error) {
    return invitationError(error);
  }
}

export async function getLinkInvitationAction(
  groupReference: string,
  invitationReference: string,
): Promise<LinkInvitationActionResult> {
  try {
    const invitation = await getOutgoingLinkInvitation(
      groupReference,
      invitationReference,
    );
    return {
      status: "success",
      message: "Персональная ссылка загружена.",
      invitePath: `/invite/${invitation.token}`,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  } catch (error) {
    return invitationError(error);
  }
}

export async function revokeInvitationAction(
  groupReference: string,
  invitationReference: string,
): Promise<InvitationActionResult> {
  try {
    const group = await revokeInvitation(groupReference, invitationReference);
    invalidateInvitationViews(group);
    return { status: "success", message: "Приглашение отозвано." };
  } catch (error) {
    return invitationError(error);
  }
}

export async function acceptDirectInvitationAction(
  invitationReference: string,
): Promise<InvitationActionResult> {
  try {
    const result = await acceptDirectInvitation(invitationReference);
    invalidateInvitationViews({ id: result.groupId, publicId: result.groupPublicId });
    return {
      status: "success",
      message: "Аккаунт подключён к участнику группы.",
      redirectTo: `/groups/${result.groupPublicId}`,
    };
  } catch (error) {
    return invitationError(error);
  }
}

export async function declineInvitationAction(
  invitationReference: string,
): Promise<InvitationActionResult> {
  try {
    const result = await declineInvitation(invitationReference);
    invalidateInvitationViews({ id: result.groupId, publicId: result.groupPublicId });
    return { status: "success", message: "Приглашение отклонено." };
  } catch (error) {
    return invitationError(error);
  }
}

export async function acceptLinkInvitationAction(
  token: string,
): Promise<InvitationActionResult> {
  try {
    const result = await acceptLinkInvitation(token);
    invalidateInvitationViews({ id: result.groupId, publicId: result.groupPublicId });
    return {
      status: "success",
      message: "Аккаунт подключён к участнику группы.",
      redirectTo: `/groups/${result.groupPublicId}`,
    };
  } catch (error) {
    return invitationError(error);
  }
}

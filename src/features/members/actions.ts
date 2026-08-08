"use server";

import { updateTag } from "next/cache";
import { ZodError } from "zod";

import type { Group } from "@/features/groups/domain/models";
import type {
  HeadmanFormValues,
  MemberFormValues,
} from "@/features/members/schemas";
import {
  createHeadman,
  createMember,
  deleteMember,
  getMembersCacheTag,
  setMemberActive,
  updateMember,
} from "@/features/members/server/operations";
import { MembersServiceError } from "@/features/members/server/errors";
import type { FormActionResult } from "@/lib/form-action";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

function invalidateMembers(group: Pick<Group, "id" | "publicId">) {
  updateTag(getMembersCacheTag(group.id));
  updateTag(getMembersCacheTag(group.publicId));
}

function memberOperationError(error: unknown): FormActionResult {
  if (error instanceof ZodError) {
    return {
      status: "error",
      formError: "Проверьте заполненные поля.",
      fieldErrors: getZodFieldErrors(
        error,
        new Set(["lastName", "firstName", "email", "role"]),
      ),
    };
  }

  if (error instanceof MembersServiceError) {
    if (error.code === "duplicate_email") {
      return {
        status: "error",
        formError: "Участник с таким email уже есть в группе.",
        fieldErrors: { email: "Этот email уже используется в группе." },
      };
    }
    if (error.code === "headman_exists") {
      return { status: "error", formError: "В группе уже есть староста." };
    }
    if (error.code === "headman_required") {
      return { status: "error", formError: "Сначала добавьте старосту группы." };
    }
    if (error.code === "headman_protected") {
      return { status: "error", formError: "Действия со старостой недоступны." };
    }
    if (error.code === "deletion_blocked") {
      return {
        status: "error",
        formError: "Участника нельзя удалить, потому что с ним связаны другие данные.",
      };
    }
    if (error.code === "member_not_found" || error.code === "group_not_found") {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
  }

  logUnexpectedOperationError("members", error);
  return {
    status: "error",
    formError: "Не удалось сохранить изменения. Повторите попытку.",
  };
}

export async function createHeadmanAction(
  groupId: string,
  values: HeadmanFormValues,
): Promise<FormActionResult> {
  try {
    const result = await createHeadman(groupId, values);
    invalidateMembers(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/members?notice=headman-created`,
    };
  } catch (error) {
    return memberOperationError(error);
  }
}

export async function createMemberAction(
  groupId: string,
  values: MemberFormValues,
): Promise<FormActionResult> {
  try {
    const result = await createMember(groupId, values);
    invalidateMembers(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/members?notice=member-created`,
    };
  } catch (error) {
    return memberOperationError(error);
  }
}

export async function updateMemberAction(
  groupId: string,
  memberId: string,
  values: MemberFormValues,
): Promise<FormActionResult> {
  try {
    const result = await updateMember(groupId, memberId, values);
    invalidateMembers(result.group);
    const status = result.member.isActive ? "active" : "inactive";
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/members?status=${status}&notice=member-updated`,
    };
  } catch (error) {
    return memberOperationError(error);
  }
}

export async function setMemberActiveAction(
  groupId: string,
  memberId: string,
  isActive: boolean,
): Promise<FormActionResult> {
  try {
    const result = await setMemberActive(groupId, memberId, isActive);
    invalidateMembers(result.group);
    const notice = isActive ? "member-reactivated" : "member-deactivated";
    const status = isActive ? "active" : "inactive";
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/members?status=${status}&notice=${notice}`,
    };
  } catch (error) {
    return memberOperationError(error);
  }
}

export async function deleteMemberAction(
  groupId: string,
  memberId: string,
  returnStatus: "active" | "inactive",
): Promise<FormActionResult> {
  try {
    const result = await deleteMember(groupId, memberId);
    invalidateMembers(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/members?status=${returnStatus}&notice=member-deleted`,
    };
  } catch (error) {
    return memberOperationError(error);
  }
}

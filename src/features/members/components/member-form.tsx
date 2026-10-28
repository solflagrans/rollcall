"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import {
  createMemberAction,
  updateMemberAction,
} from "@/features/members/actions";
import {
  editableGroupMemberRoles,
  type EditableGroupMemberRole,
} from "@/features/members/domain/members";
import { memberRoleLabels } from "@/features/members/presentation/member-copy";
import {
  memberFormSchema,
  type MemberFormValues,
} from "@/features/members/schemas";
import { useActionLock } from "@/lib/use-action-lock";

type MemberFormMode = "create" | "edit";

export function MemberForm({
  mode,
  groupId,
  memberId,
  defaultValues,
  returnTo,
}: {
  mode: MemberFormMode;
  groupId: string;
  memberId?: string;
  defaultValues?: Partial<MemberFormValues>;
  returnTo?: string;
}) {
  const router = useRouter();
  const submission = useActionLock();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema) as Resolver<MemberFormValues>,
    defaultValues: {
      lastName: defaultValues?.lastName ?? "",
      firstName: defaultValues?.firstName ?? "",
      role: defaultValues?.role ?? "student",
    },
  });

  useUnsavedChanges(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    const result = await submission.run(() =>
      mode === "create"
          ? createMemberAction(groupId, values)
          : updateMemberAction(groupId, memberId!, values),
    );
    if (!result) return;

    if (result.status === "success") {
      reset(values);
      if (mode === "edit" && returnTo) {
        const separator = returnTo.includes("?") ? "&" : "?";
        router.push(`${returnTo}${separator}notice=member-updated`);
      } else {
        router.push(result.redirectTo);
      }
      return;
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "lastName" || field === "firstName" || field === "role") {
        setError(field, { message });
      }
    }
    setError("root", { message: result.formError });
  });

  const describedBy = (field: keyof MemberFormValues) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={errors.root?.message} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="lastName" label="Фамилия" error={errors.lastName?.message}>
          <Input
            id="lastName"
            autoComplete="family-name"
            autoFocus
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={describedBy("lastName")}
            {...register("lastName")}
          />
        </FormField>
        <FormField id="firstName" label="Имя" error={errors.firstName?.message}>
          <Input
            id="firstName"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={describedBy("firstName")}
            {...register("firstName")}
          />
        </FormField>
      </div>

      <FormField id="role" label="Роль" error={errors.role?.message}>
          <NativeSelect
            id="role"
            aria-invalid={Boolean(errors.role)}
            aria-describedby={describedBy("role")}
            {...register("role")}
          >
            {editableGroupMemberRoles.map((role: EditableGroupMemberRole) => (
              <option key={role} value={role}>
                {memberRoleLabels[role]}
              </option>
            ))}
          </NativeSelect>
      </FormField>

      <Button type="submit" size="lg" disabled={isSubmitting || submission.isLocked}>
        {isSubmitting || submission.isLocked
          ? "Сохранение…"
          : mode === "create"
              ? "Добавить участника"
              : "Сохранить изменения"}
      </Button>
    </form>
  );
}

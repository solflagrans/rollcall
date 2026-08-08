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
}: {
  mode: MemberFormMode;
  groupId: string;
  memberId?: string;
  defaultValues?: Partial<MemberFormValues>;
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
      email: defaultValues?.email ?? "",
      role: defaultValues?.role ?? "student",
    },
  });

  useUnsavedChanges(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    const result = await submission.run(() =>
      mode === "create"
          ? createMemberAction(groupId, {
              ...values,
              email: values.email ?? "",
            })
          : updateMemberAction(groupId, memberId!, {
              ...values,
              email: values.email ?? "",
            }),
    );
    if (!result) return;

    if (result.status === "success") {
      reset(values);
      router.push(result.redirectTo);
      return;
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "lastName" || field === "firstName" || field === "email" || field === "role") {
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
            className="mt-1"
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
            className="mt-1"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={describedBy("firstName")}
            {...register("firstName")}
          />
        </FormField>
      </div>

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          className="mt-1"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
          {...register("email")}
        />
      </FormField>

      <FormField id="role" label="Роль" error={errors.role?.message}>
          <NativeSelect
            id="role"
            className="mt-1"
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

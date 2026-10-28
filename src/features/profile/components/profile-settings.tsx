"use client";

import { Copy, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AuthUserProfile } from "@/features/auth/domain/models";
import { FormField } from "@/features/groups/components/form-field";
import {
  changePasswordAction,
  updatePersonalDataAction,
  type ProfileActionResult,
} from "@/features/profile/actions";

const initialState: ProfileActionResult = { status: "idle" };

function ActionStatus({ state }: { state: ProfileActionResult }) {
  if (state.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
      >
        {state.formError}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p
        role="status"
        className="rounded-sm border border-primary/20 bg-accent p-3 text-sm text-accent-foreground"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

function PersonalDataForm({ profile }: { profile: AuthUserProfile }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updatePersonalDataAction,
    initialState,
  );
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold">Личные данные</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Имя и фамилия принадлежат вашему аккаунту Rollcall.
        </p>
      </div>
      <ActionStatus state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="profile-first-name" label="Имя" error={errors?.firstName}>
          <Input
            id="profile-first-name"
            name="firstName"
            autoComplete="given-name"
            defaultValue={profile.firstName}
            required
            aria-invalid={Boolean(errors?.firstName)}
          />
        </FormField>
        <FormField id="profile-last-name" label="Фамилия" error={errors?.lastName}>
          <Input
            id="profile-last-name"
            name="lastName"
            autoComplete="family-name"
            defaultValue={profile.lastName}
            required
            aria-invalid={Boolean(errors?.lastName)}
          />
        </FormField>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить изменения"}
      </Button>
    </form>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Изменение пароля"
      description="Введите текущий пароль и задайте новый."
    >
      <form ref={formRef} action={formAction} className="space-y-5">
        <ActionStatus state={state} />
        <FormField
          id="current-password"
          label="Текущий пароль"
          error={errors?.currentPassword}
        >
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors?.currentPassword)}
          />
        </FormField>
        <FormField
          id="new-password"
          label="Новый пароль"
          hint="Не менее 8 символов, с буквой и цифрой."
          error={errors?.newPassword}
        >
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors?.newPassword)}
          />
        </FormField>
        <FormField
          id="confirm-password"
          label="Повторите новый пароль"
          error={errors?.confirmPassword}
        >
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors?.confirmPassword)}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Сохраняем…" : "Изменить пароль"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ProfileSettings({
  profile,
  email,
}: {
  profile: AuthUserProfile;
  email: string;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [rollcallIdCopied, setRollcallIdCopied] = useState(false);

  return (
    <div className="space-y-6">
      <section data-surface="raised" className="rounded-md border bg-card p-5 shadow-xs sm:p-8">
        <PersonalDataForm profile={profile} />
      </section>

      <section data-surface="raised" className="rounded-md border bg-card p-5 shadow-xs sm:p-8">
        <div>
          <h2 className="font-heading text-xl font-semibold">Rollcall ID</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Постоянный публичный идентификатор для персональных приглашений. Он не раскрывает внутренний ID аккаунта.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-sm border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <code className="break-all text-sm">{profile.rollcallId}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(profile.rollcallId);
              setRollcallIdCopied(true);
              window.setTimeout(() => setRollcallIdCopied(false), 1600);
            }}
          >
            <Copy aria-hidden="true" />
            {rollcallIdCopied ? "Скопировано" : "Скопировать"}
          </Button>
        </div>
      </section>

      <section data-surface="raised" className="rounded-md border bg-card p-5 shadow-xs sm:p-8">
        <div>
          <h2 className="font-heading text-xl font-semibold">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Основной адрес для входа и системных писем.
          </p>
        </div>
        <div className="mt-5 rounded-sm border bg-background px-3 py-2.5 text-sm">
          {email}
        </div>
      </section>

      <section data-surface="raised" className="rounded-md border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">Безопасность</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Измените пароль для входа в аккаунт.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound aria-hidden="true" />
            Изменить пароль
          </Button>
        </div>
      </section>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}

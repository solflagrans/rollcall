"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestPasswordResetAction,
  resendVerificationCodeAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
  type AuthActionResult,
} from "@/features/auth/actions";
import { FormField } from "@/features/groups/components/form-field";

const initialAuthActionState: AuthActionResult = { status: "idle" };

function FormStatus({ state }: { state: AuthActionResult }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {state.formError}
      </p>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <p role="status" className="rounded-sm border border-primary/20 bg-accent p-3 text-sm text-accent-foreground">
        {state.message}
      </p>
    );
  }
  return null;
}

function useAuthAction(action: typeof signInAction) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);
  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);
  return { state, formAction, pending };
}

export function SignInForm({ returnTo }: { returnTo?: string }) {
  const { state, formAction, pending } = useAuthAction(signInAction);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-5">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <FormStatus state={state} />
      <FormField id="email" label="Email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors?.email)} />
      </FormField>
      <FormField id="password" label="Пароль" error={errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(errors?.password)} />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </Button>
      <div className="flex items-center justify-between gap-4 text-sm">
        <Link className="text-primary hover:underline" href="/auth/forgot-password">Забыли пароль?</Link>
        <Link className="text-primary hover:underline" href={returnTo ? `/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}` : "/auth/sign-up"}>Создать аккаунт</Link>
      </div>
    </form>
  );
}

export function SignUpForm({ returnTo }: { returnTo?: string }) {
  const { state, formAction, pending } = useAuthAction(signUpAction);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-5">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <FormStatus state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="firstName" label="Имя" error={errors?.firstName}>
          <Input id="firstName" name="firstName" autoComplete="given-name" required aria-invalid={Boolean(errors?.firstName)} />
        </FormField>
        <FormField id="lastName" label="Фамилия" error={errors?.lastName}>
          <Input id="lastName" name="lastName" autoComplete="family-name" required aria-invalid={Boolean(errors?.lastName)} />
        </FormField>
      </div>
      <FormField id="email" label="Email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors?.email)} />
      </FormField>
      <FormField id="password" label="Пароль" hint="Не менее 8 символов, с буквой и цифрой." error={errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(errors?.password)} />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт? <Link className="text-primary hover:underline" href={returnTo ? `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}` : "/auth/sign-in"}>Войти</Link>
      </p>
    </form>
  );
}

export function VerifyEmailForm({ email, returnTo }: { email: string; returnTo?: string }) {
  const { state, formAction, pending } = useAuthAction(verifyEmailAction);
  const [resendState, resendAction, resendPending] = useActionState(
    resendVerificationCodeAction,
    initialAuthActionState,
  );
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <FormStatus state={state} />
        <FormField id="code" label="Код подтверждения" hint={`Мы отправили код на ${email}.`} error={errors?.code}>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" required aria-invalid={Boolean(errors?.code)} />
        </FormField>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Проверяем…" : "Подтвердить email"}
        </Button>
      </form>
      <form action={resendAction} className="space-y-3 text-center">
        <input type="hidden" name="email" value={email} />
        <FormStatus state={resendState} />
        <Button type="submit" variant="ghost" disabled={resendPending}>
          {resendPending ? "Отправляем…" : "Отправить код повторно"}
        </Button>
      </form>
    </div>
  );
}

export function ForgotPasswordForm() {
  const { state, formAction, pending } = useAuthAction(requestPasswordResetAction);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-5">
      <FormStatus state={state} />
      <FormField id="email" label="Email" hint="Пришлём код для смены пароля." error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors?.email)} />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Отправляем…" : "Получить код"}
      </Button>
      <p className="text-center text-sm"><Link className="text-primary hover:underline" href="/auth/sign-in">Вернуться ко входу</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ email }: { email: string }) {
  const { state, formAction, pending } = useAuthAction(resetPasswordAction);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="email" value={email} />
      <FormStatus state={state} />
      <FormField id="code" label="Код восстановления" error={errors?.code}>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" required aria-invalid={Boolean(errors?.code)} />
      </FormField>
      <FormField id="password" label="Новый пароль" hint="Не менее 8 символов, с буквой и цифрой." error={errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(errors?.password)} />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Сохраняем…" : "Сменить пароль"}
      </Button>
    </form>
  );
}

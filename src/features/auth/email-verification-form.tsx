"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, Mail } from "lucide-react";
import {
  changeVerificationEmailAction,
  requestEmailVerificationAction,
  verifyEmailCodeAction,
} from "@/server/auth/verification-actions";

const initialState: { error?: string } = {};

export function VerificationRequestForm() {
  const [state, action, pending] = useActionState(requestEmailVerificationAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return <form action={action} className="login-form">
    <div className="field"><label htmlFor="verification-email">Email</label><input className="input" id="verification-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
    <div className="field"><label htmlFor="verification-password">Пароль</label><div className="password-wrap"><input className="input" id="verification-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={8} maxLength={100} required /><button className="icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <Mail size={18} />}{pending ? "Проверяем…" : "Продолжить подтверждение"}</button>
  </form>;
}

export function VerificationCodeForm({ email, codeSent }: { email: string; codeSent: boolean }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailCodeAction, initialState);
  const [resendState, resendAction, resending] = useActionState(requestEmailVerificationAction, initialState);

  return <div className="verification-stack">
    {codeSent && <div className="auth-notice" role="status"><strong>Код отправлен</strong><p>Проверьте входящие и папку «Спам».</p></div>}
    <p className="verification-email">Код отправлен на <strong>{email}</strong></p>
    <form action={verifyAction} className="login-form">
      <div className="field"><label htmlFor="verification-code">Код из письма</label><input className="input verification-code" id="verification-code" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" minLength={4} maxLength={10} autoFocus required /></div>
      {verifyState.error && <p role="alert" className="form-error">{verifyState.error}</p>}
      <button className="button primary" type="submit" disabled={verifying}>{verifying ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}{verifying ? "Проверяем…" : "Подтвердить email"}</button>
    </form>
    <div className="verification-actions">
      <form action={resendAction}><button className="link-button" type="submit" disabled={resending}>{resending ? "Отправляем…" : "Отправить код ещё раз"}</button></form>
      <form action={changeVerificationEmailAction}><button className="link-button" type="submit">Указать другой email</button></form>
    </div>
    {resendState.error && <p role="alert" className="form-error">{resendState.error}</p>}
  </div>;
}

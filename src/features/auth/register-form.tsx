"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { registerAction, type RegisterState } from "@/server/auth/actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return <form action={action} className="login-form">
    <div className="field"><label htmlFor="register-name">Имя и фамилия</label><input className="input" id="register-name" name="name" autoComplete="name" minLength={2} maxLength={120} required /></div>
    <div className="field"><label htmlFor="register-email">Email</label><input className="input" id="register-email" name="email" type="email" autoComplete="email" required /></div>
    <div className="field"><label htmlFor="register-password">Пароль</label><div className="password-wrap"><input className="input" id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={100} required /><button className="icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    <div className="field"><label htmlFor="register-password-confirm">Повторите пароль</label><input className="input" id="register-password-confirm" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={100} required /></div>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <UserPlus size={18} />}{pending ? "Создаём…" : "Продолжить"}</button>
  </form>;
}

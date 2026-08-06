"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { loginAction, type LoginState } from "@/server/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  return <form action={action} className="login-form">
    <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
    <div className="field"><label htmlFor="password">Пароль</label><div className="password-wrap"><input className="input" id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={8} required /><button className="icon-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.verificationPending && <Link className="button" href="/verify-email?sent=1">Ввести код подтверждения</Link>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <LogIn size={18} />}{pending ? "Входим…" : "Войти"}</button>
  </form>;
}

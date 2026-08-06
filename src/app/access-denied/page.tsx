import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getAppSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function AccessDenied() {
  const session = await getAppSession();
  return <main className="login-page"><section className="login-card" style={{ textAlign: "center" }}><span className="brand-mark" style={{ margin: "0 auto 18px" }}><ShieldAlert /></span><h1>Нет доступа</h1><p>{session ? "Эта страница недоступна для вашей роли." : "Войдите, чтобы продолжить."}</p><Link className="button primary" href={!session ? "/login" : session.role === "student" ? "/student" : "/dashboard"}>{!session ? "Перейти ко входу" : "Вернуться в приложение"}</Link></section></main>;
}

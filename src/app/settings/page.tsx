import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAppSession } from "@/server/auth/session";
import { roleLabels } from "@/lib/constants";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  return <AppShell session={session}><header className="page-header"><div><h1>Настройки</h1><p>Профиль и параметры интерфейса</p></div></header><div className="grid" style={{ maxWidth: 720 }}><section className="card"><div className="card-header"><h2>Профиль</h2></div><div className="card-body form-grid"><div className="field"><label>Имя</label><div className="input">{session.displayName}</div></div><div className="field"><label>Email</label><div className="input">{session.email}</div></div><div className="field"><label>Группа</label><div className="input">{session.groupName}</div></div><div className="field"><label>Роль</label><div className="input">{roleLabels[session.role]}</div></div></div></section><section className="card"><div className="card-header"><h2>Оформление</h2><ThemeToggle /></div><div className="card-body"><p className="muted">Тема по умолчанию следует системным настройкам. Ручной выбор сохраняется в браузере.</p></div></section>{session.role !== "student" && <section className="card danger-zone"><div className="card-header"><h2>Настройки группы</h2></div><div className="card-body"><p className="muted">Управление периодами и расширенные настройки запланированы для следующей версии. Текущий активный период задаётся в базе данных.</p></div></section>}</div></AppShell>;
}

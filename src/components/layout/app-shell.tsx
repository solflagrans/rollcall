import Link from "next/link";
import { BookOpenCheck, LogOut, Plus } from "lucide-react";
import type { AppSession } from "@/server/auth/session";
import { logoutAction } from "@/server/auth/actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppNavigation, MobileNavigation } from "@/components/layout/app-navigation";

export function AppShell({ session, children }: { session: AppSession; children: React.ReactNode }) {
  const isStudent = session.role === "student";
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href={isStudent ? "/student" : "/dashboard"} className="brand"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>Перекличка</span></Link>
      <div className="group-card"><span className="eyebrow">Учебная группа</span><strong>{session.groupName}</strong></div>
      <AppNavigation isStudent={isStudent} />
      {!isStudent && <Link href="/lessons/new" className="button primary"><Plus size={18} />Отметить посещаемость</Link>}
      <div className="sidebar-footer">
        <div className="avatar">{session.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
        <div className="user-meta"><strong>{session.displayName}</strong><span>{session.email}</span></div>
        <ThemeToggle />
        <form action={logoutAction}><button className="icon-button" aria-label="Выйти"><LogOut size={18} /></button></form>
      </div>
    </aside>
    <main className="main-content">{children}</main>
    <MobileNavigation isStudent={isStudent} />
  </div>;
}

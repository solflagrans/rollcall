"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BookText, CalendarCheck2, GraduationCap, LayoutDashboard, LoaderCircle, Plus, Settings, Users } from "lucide-react";

const adminLinks = [
  ["/dashboard", "Обзор", LayoutDashboard], ["/journal", "Журнал", BookText], ["/students", "Студенты", Users], ["/subjects", "Дисциплины", GraduationCap], ["/settings", "Настройки", Settings],
] as const;
const studentLinks = [["/student", "Обзор", LayoutDashboard], ["/attendance", "Посещения", CalendarCheck2], ["/settings", "Настройки", Settings]] as const;

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <LoaderCircle className="nav-spinner animate-spin" size={15} aria-label="Загрузка страницы" /> : null;
}

export function AppNavigation({ isStudent }: { isStudent: boolean }) {
  const pathname = usePathname();
  const links = isStudent ? studentLinks : adminLinks;
  return <nav aria-label="Основная навигация" className="side-nav">
      {links.map(([href, label, Icon]) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}><Icon size={19} /><span>{label}</span><PendingIndicator /></Link>)}
    </nav>;
}

export function MobileNavigation({ isStudent }: { isStudent: boolean }) {
  const pathname = usePathname();
  const links = isStudent ? studentLinks : adminLinks;
  return <nav aria-label="Мобильная навигация" className="mobile-nav">
      {links.slice(0, 4).map(([href, label, Icon]) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span><PendingIndicator /></Link>)}
      {!isStudent && <Link href="/lessons/new" className="mobile-add" aria-label="Добавить занятие"><Plus size={25} /><PendingIndicator /></Link>}
    </nav>;
}

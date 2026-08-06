import Link from "next/link";
import { AlertTriangle, CalendarDays, Percent, Plus, UserRoundX } from "lucide-react";
import { requireAppSession } from "@/server/auth/session";
import { getGroupDashboard } from "@/server/services/dashboard";
import { formatDate } from "@/lib/utils";
import { lessonTypeLabels } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await requireAppSession();
  const data = await getGroupDashboard(session.groupId);
  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <>
    <header className="page-header"><div><span className="eyebrow">{data.period?.name ?? "Учебный период"}</span><h1>{session.groupName}</h1><p>Сегодня {today}</p></div><Link href="/lessons/new" className="button primary"><Plus size={18} /><span>Отметить посещаемость</span></Link></header>
    <section className="grid stats-grid" aria-label="Сводная статистика">
      <Stat label="Занятий" value={data.totals.lessons} note="за текущий период" icon={<CalendarDays size={18} />} />
      <Stat label="Посещаемость" value={data.totals.percentage === null ? "—" : `${data.totals.percentage}%`} note="без уважительных причин" icon={<Percent size={18} />} />
      <Stat label="Пропусков" value={data.totals.absences} note="всего отметок Н" icon={<UserRoundX size={18} />} />
      <Stat label="Требуют внимания" value={data.totals.lowAttendance} note="посещаемость ниже 70%" icon={<AlertTriangle size={18} />} />
    </section>
    <section className="card"><div className="card-header"><h2>Последние занятия</h2><Link className="button" href="/journal">Открыть журнал</Link></div>
      {data.lessons.length === 0 ? <div className="empty">Занятий пока нет. Создайте первое занятие.</div> : <><div className="table-wrap desktop-table"><table><thead><tr><th>Дата</th><th>Дисциплина</th><th>Тип</th><th>П / Н / О / У</th><th></th></tr></thead><tbody>{data.lessons.slice(0, 7).map((lesson) => <tr key={lesson.id}><td>{formatDate(lesson.date)}</td><td><strong>{lesson.subject}</strong></td><td>{lessonTypeLabels[lesson.type]}</td><td><Counts stats={lesson.stats} /></td><td><Link href={`/lessons/${lesson.id}/edit`} className="button">Изменить</Link></td></tr>)}</tbody></table></div>
      <div className="mobile-cards">{data.lessons.slice(0, 7).map((lesson) => <Link className="mobile-card" href={`/lessons/${lesson.id}/edit`} key={lesson.id}><div className="mobile-card-top"><strong>{lesson.subject}</strong><span className="muted">{formatDate(lesson.date)}</span></div><div className="mobile-card-meta"><span>{lessonTypeLabels[lesson.type]}</span><Counts stats={lesson.stats} /></div></Link>)}</div></>}
    </section>
  </>;
}

function Stat({ label, value, note, icon }: { label: string; value: React.ReactNode; note: string; icon: React.ReactNode }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>; }
function Counts({ stats }: { stats: { present: number; absent: number; late: number; excused: number } }) { return <span className="count-row" aria-label={`Присутствовали ${stats.present}, отсутствовали ${stats.absent}, опоздали ${stats.late}, уважительная причина ${stats.excused}`}><span className="count-pill">П {stats.present}</span><span className="count-pill">Н {stats.absent}</span><span className="count-pill">О {stats.late}</span><span className="count-pill">У {stats.excused}</span></span>; }

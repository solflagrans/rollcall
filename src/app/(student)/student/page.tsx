import { CalendarCheck2, CircleHelp, Clock3, Percent, UserRoundX } from "lucide-react";
import { requireAppSession } from "@/server/auth/session";
import { getStudentDashboard } from "@/server/services/dashboard";
import { StudentHistory } from "@/features/attendance/student-history";

export default async function StudentPage() {
  const session = await requireAppSession();
  const data = await getStudentDashboard(session.groupId, session.membershipId);
  return <><header className="page-header"><div><span className="eyebrow">Личный кабинет</span><h1>{session.displayName}</h1><p>Здесь видны только ваши отметки посещаемости</p></div></header>
    <section className="grid stats-grid"><Stat label="Посещаемость" value={data.overall.percentage === null ? "—" : `${data.overall.percentage}%`} note="П + О, без уважительных" icon={<Percent size={18} />} /><Stat label="Посещено" value={data.overall.attended} note="включая опоздания" icon={<CalendarCheck2 size={18} />} /><Stat label="Пропущено" value={data.overall.absent} note="без уважительной причины" icon={<UserRoundX size={18} />} /><Stat label="Опоздания / Уваж." value={`${data.overall.late} / ${data.overall.excused}`} note="учитываются раздельно" icon={<Clock3 size={18} />} /></section>
    <section className="card" style={{ marginBottom: 20 }}><div className="card-header"><h2>По дисциплинам</h2></div><div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{data.bySubject.map((item) => <div className="summary-item" key={item.subject}><span className="muted">{item.subject}</span><strong>{item.percentage === null ? "—" : `${item.percentage}%`}</strong><small className="muted">Н {item.absent} · О {item.late} · У {item.excused}</small></div>)}</div></section>
    <div className="card" style={{ marginBottom: 20 }}><div className="card-body" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><CircleHelp size={18} style={{ flex: "none", color: "var(--primary)" }} /><span className="muted">Формула: (присутствовал + опоздал) / (все занятия − уважительные причины). Если знаменатель равен нулю, процент не рассчитывается.</span></div></div>
    <h2>История посещений</h2><StudentHistory rows={data.rows} />
  </>;
}

function Stat({ label, value, note, icon }: { label: string; value: React.ReactNode; note: string; icon: React.ReactNode }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>; }

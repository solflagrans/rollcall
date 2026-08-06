import { UserPlus } from "lucide-react";
import { requireAppSession } from "@/server/auth/session";
import { getStudents } from "@/server/services/dashboard";
import { roleLabels } from "@/lib/constants";
import { AddStudentForm } from "@/features/students/admin-forms";
import { setMembershipActiveAction } from "@/server/actions/admin";

export default async function StudentsPage() {
  const session = await requireAppSession();
  const students = await getStudents(session.groupId);
  return <><header className="page-header"><div><h1>Студенты</h1><p>{students.filter((student) => student.isActive).length} активных участников группы</p></div></header>
    <section className="card" style={{ marginBottom: 20 }}><div className="card-header"><h2><UserPlus size={18} style={{ display: "inline", marginRight: 8 }} />Новый участник</h2></div><div className="card-body"><AddStudentForm /></div></section>
    <section className="card"><div className="table-wrap desktop-table"><table><thead><tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Статус</th><th>Посещаемость</th><th>Пропуски</th><th></th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.displayName}</strong></td><td className="muted">{student.email}</td><td>{roleLabels[student.role]}</td><td><span className={`status ${student.isActive ? "status-present" : "status-excused"}`}>{student.isActive ? "Активен" : "В архиве"}</span></td><td>{student.stats.percentage === null ? "—" : `${student.stats.percentage}%`}</td><td>{student.stats.absent}</td><td><form action={setMembershipActiveAction.bind(null, student.id, !student.isActive)}><button className={`button ${student.isActive ? "danger" : ""}`} disabled={student.id === session.membershipId}>{student.isActive ? "Деактивировать" : "Активировать"}</button></form></td></tr>)}</tbody></table></div>
      <div className="mobile-cards">{students.map((student) => <article className="mobile-card" key={student.id}><div className="mobile-card-top"><div className="subject-cell"><strong>{student.displayName}</strong><span>{student.email}</span></div><span className={`status ${student.isActive ? "status-present" : "status-excused"}`}>{student.isActive ? "Активен" : "Архив"}</span></div><div className="mobile-card-meta"><span>{roleLabels[student.role]}</span><span>Посещаемость {student.stats.percentage ?? "—"}%</span><span>Н {student.stats.absent}</span></div><form action={setMembershipActiveAction.bind(null, student.id, !student.isActive)} style={{ marginTop: 12 }}><button className="button" disabled={student.id === session.membershipId}>{student.isActive ? "Деактивировать" : "Активировать"}</button></form></article>)}</div>
    </section>
  </>;
}

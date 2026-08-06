import { BookPlus } from "lucide-react";
import { requireAppSession } from "@/server/auth/session";
import { getSubjects } from "@/server/services/dashboard";
import { AddSubjectForm } from "@/features/students/admin-forms";
import { toggleSubjectAction } from "@/server/actions/admin";

export default async function SubjectsPage() {
  const session = await requireAppSession();
  const subjects = await getSubjects(session.groupId);
  return <><header className="page-header"><div><h1>Дисциплины</h1><p>Активные дисциплины доступны при создании занятия</p></div></header>
    <section className="card" style={{ marginBottom: 20 }}><div className="card-header"><h2><BookPlus size={18} style={{ display: "inline", marginRight: 8 }} />Новая дисциплина</h2></div><div className="card-body"><AddSubjectForm /></div></section>
    <section className="card"><div className="table-wrap desktop-table"><table><thead><tr><th>Название</th><th>Короткое</th><th>Преподаватель</th><th>Занятий</th><th>Статус</th><th></th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td><strong>{subject.name}</strong></td><td>{subject.shortName}</td><td className="muted">{subject.teacher ?? "—"}</td><td>{subject.lessonCount}</td><td><span className={`status ${subject.isActive ? "status-present" : "status-excused"}`}>{subject.isActive ? "Активна" : "Архив"}</span></td><td><form action={toggleSubjectAction.bind(null, subject.id, !subject.isActive)}><button className="button">{subject.isActive ? "В архив" : "Восстановить"}</button></form></td></tr>)}</tbody></table></div>
    <div className="mobile-cards">{subjects.map((subject) => <article className="mobile-card" key={subject.id}><div className="mobile-card-top"><div className="subject-cell"><strong>{subject.name}</strong><span>{subject.teacher ?? "Преподаватель не указан"}</span></div><span className={`status ${subject.isActive ? "status-present" : "status-excused"}`}>{subject.isActive ? "Активна" : "Архив"}</span></div><div className="mobile-card-meta"><span>{subject.shortName}</span><span>{subject.lessonCount} занятий</span></div><form action={toggleSubjectAction.bind(null, subject.id, !subject.isActive)} style={{ marginTop: 12 }}><button className="button">{subject.isActive ? "В архив" : "Восстановить"}</button></form></article>)}</div></section>
  </>;
}

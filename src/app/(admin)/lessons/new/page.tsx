import { LessonEditor } from "@/features/attendance/lesson-editor";
import { requireAppSession } from "@/server/auth/session";
import { getActiveLessonSetup } from "@/server/services/dashboard";

export default async function NewLessonPage() {
  const session = await requireAppSession();
  const setup = await getActiveLessonSetup(session.groupId);
  return <><header className="page-header"><div><h1>Новое занятие</h1><p>Отметьте только исключения — все студенты уже присутствуют</p></div></header>{setup.students.length && setup.subjects.length ? <LessonEditor groupId={session.groupId} {...setup} /> : <section className="card"><div className="empty">Для создания занятия нужны активные студенты и дисциплины.</div></section>}</>;
}

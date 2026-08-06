import { notFound } from "next/navigation";
import { LessonEditor } from "@/features/attendance/lesson-editor";
import { requireAppSession } from "@/server/auth/session";
import { getLessonForEdit } from "@/server/services/dashboard";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAppSession();
  const data = await getLessonForEdit(session.groupId, id);
  if (!data) notFound();
  return <><header className="page-header"><div><h1>Редактирование занятия</h1><p>Изменения отметок сохраняются в журнале аудита</p></div></header><LessonEditor groupId={session.groupId} subjects={data.subjects} students={[]} initial={{ lessonId: id, subjectId: data.lesson.subjectId, lessonDate: data.lesson.lessonDate, type: data.lesson.type, comment: data.lesson.comment ?? "", marks: data.marks.map((mark) => ({ studentMembershipId: mark.studentMembershipId, displayName: mark.displayName, status: mark.status, comment: mark.comment ?? "" })) }} /></>;
}

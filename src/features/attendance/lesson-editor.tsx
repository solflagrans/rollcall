"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, RotateCcw, Save, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { attendanceStatuses, lessonTypeLabels, statusMeta, type AttendanceStatus } from "@/lib/constants";
import { lessonFormSchema, type LessonFormValues } from "./validation";
import { createLessonAction, updateLessonAction } from "@/server/actions/lessons";

type Student = { id: string; displayName: string };
type Subject = { id: string; name: string; shortName: string; teacher: string | null };
type Initial = { lessonId: string; subjectId: string; lessonDate: string; type: LessonFormValues["type"]; comment?: string; marks: { studentMembershipId: string; displayName: string; status: AttendanceStatus; comment?: string }[] };

export function LessonEditor({ groupId, students, subjects, initial }: { groupId: string; students: Student[]; subjects: Subject[]; initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const defaultMarks = initial?.marks ?? students.map((student) => ({ studentMembershipId: student.id, displayName: student.displayName, status: "present" as const, comment: "" }));
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: { groupId, subjectId: initial?.subjectId ?? subjects[0]?.id ?? "", lessonDate: initial?.lessonDate ?? new Date().toISOString().slice(0, 10), type: initial?.type ?? "lecture", comment: initial?.comment ?? "", marks: defaultMarks.map(({ studentMembershipId, status, comment }) => ({ studentMembershipId, status, comment })) },
  });
  const marks = form.watch("marks");
  const selectedSubject = subjects.find((subject) => subject.id === form.watch("subjectId"));
  const nameById = new Map(defaultMarks.map((mark) => [mark.studentMembershipId, mark.displayName]));
  const summary = useMemo(() => attendanceStatuses.reduce<Record<AttendanceStatus, number>>((result, status) => ({ ...result, [status]: marks.filter((mark) => mark.status === status).length }), { present: 0, absent: 0, late: 0, excused: 0 }), [marks]);
  const visible = marks.map((mark, index) => ({ mark, index, name: nameById.get(mark.studentMembershipId) ?? "Студент" })).filter(({ mark, name }) => name.toLowerCase().includes(search.toLowerCase()) && (!exceptionsOnly || mark.status !== "present"));

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [form.formState.isDirty]);

  const setAll = (status: AttendanceStatus) => form.setValue("marks", marks.map((mark) => ({ ...mark, status })), { shouldDirty: true });
  const submit = form.handleSubmit((values) => startTransition(async () => {
    const result = initial ? await updateLessonAction(initial.lessonId, values) : await createLessonAction(values);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Занятие сохранено");
    form.reset(values);
    router.push("/journal");
    router.refresh();
  }));

  return <form onSubmit={submit} className="lesson-editor">
    <div className="grid">
      <section className="card"><div className="card-header"><h2>Параметры занятия</h2></div><div className="card-body form-grid">
        <div className="field"><label htmlFor="lessonDate">Дата</label><input className="input" id="lessonDate" type="date" {...form.register("lessonDate")} />{form.formState.errors.lessonDate && <span className="form-error">Укажите дату</span>}</div>
        <div className="field"><label htmlFor="subjectId">Дисциплина</label><select className="input" id="subjectId" {...form.register("subjectId")}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select>{form.formState.errors.subjectId && <span className="form-error">Выберите дисциплину</span>}</div>
        <div className="field"><label htmlFor="type">Тип занятия</label><select className="input" id="type" {...form.register("type")}>{Object.entries(lessonTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="field"><label>Преподаватель</label><div className="input" style={{ display: "flex", alignItems: "center", color: "var(--muted)" }}>{selectedSubject?.teacher ?? "Не указан"}</div></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="comment">Комментарий</label><textarea className="input" id="comment" placeholder="Необязательный комментарий" {...form.register("comment")} /></div>
      </div></section>
      <section className="card"><div className="card-header"><div><h2>Отметки студентов</h2><span className="muted">По умолчанию все присутствуют</span></div><div className="header-actions"><button type="button" className="button" onClick={() => setAll("present")}><Check size={17} />Все присутствуют</button><button type="button" className="button" onClick={() => form.resetField("marks")}><RotateCcw size={17} />Сбросить</button></div></div>
        <div className="card-body filters"><div className="password-wrap" style={{ flex: 1 }}><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти студента" aria-label="Найти студента" /><span className="icon-button" style={{ position: "absolute", right: 2, top: 2, border: 0 }}><Search size={17} /></span></div><label className="button"><input type="checkbox" checked={exceptionsOnly} onChange={(event) => setExceptionsOnly(event.target.checked)} />Только исключения</label></div>
        <div className="student-list">{visible.length === 0 ? <div className="empty">Нет студентов по выбранному фильтру</div> : visible.map(({ mark, index, name }) => <div className="student-mark" key={mark.studentMembershipId}><strong>{name}</strong>{attendanceStatuses.map((status) => <button key={status} type="button" className="status-choice" data-active={mark.status === status} title={statusMeta[status].label} aria-label={`${name}: ${statusMeta[status].label}`} aria-pressed={mark.status === status} onClick={() => form.setValue(`marks.${index}.status`, status, { shouldDirty: true })}>{statusMeta[status].short}</button>)}</div>)}</div>
      </section>
    </div>
    <aside className="editor-side"><section className="card"><div className="card-header"><h2>Сводка</h2></div><div className="card-body summary-list">{attendanceStatuses.map((status) => <div className="summary-item" key={status}><strong>{summary[status]}</strong><span className="muted">{statusMeta[status].label}</span></div>)}</div></section>
      <section className="card sticky-save"><p className="muted" style={{ marginTop: 0 }}>{form.formState.isDirty ? "Есть несохранённые изменения" : initial ? "Все изменения сохранены" : `${marks.length} студентов в списке`}</p>{form.formState.errors.marks && <p className="form-error">Ошибка в отметках студентов</p>}<button className="button primary" type="submit" disabled={pending} style={{ width: "100%" }}><Save size={18} />{pending ? "Сохраняем…" : "Сохранить занятие"}</button></section>
    </aside>
  </form>;
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { addStudentAction, addSubjectAction, type FormState } from "@/server/actions/admin";

const initial: FormState = {};

export function AddStudentForm() {
  const [state, action, pending] = useActionState(addStudentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) { toast.success("Студент добавлен"); formRef.current?.reset(); } }, [state]);
  return <form action={action} ref={formRef} className="form-grid"><div className="field"><label htmlFor="student-name">ФИО</label><input className="input" id="student-name" name="name" required minLength={2} /></div><div className="field"><label htmlFor="student-email">Email</label><input className="input" id="student-email" name="email" type="email" required /></div><div className="field"><label htmlFor="student-role">Роль</label><select className="input" id="student-role" name="role" defaultValue="student"><option value="student">Студент</option><option value="deputy">Заместитель</option><option value="headman">Староста</option></select></div><div className="field" style={{ justifyContent: "end" }}><button className="button primary" disabled={pending}>{pending ? "Добавляем…" : "Добавить участника"}</button></div>{state.error && <p className="form-error" style={{ gridColumn: "1/-1" }}>{state.error}</p>}<p className="muted" style={{ gridColumn: "1/-1", margin: 0 }}>В production создайте или пригласите соответствующего пользователя в Neon Auth, затем свяжите его auth ID с профилем.</p></form>;
}

export function AddSubjectForm() {
  const [state, action, pending] = useActionState(addSubjectAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) { toast.success("Дисциплина добавлена"); formRef.current?.reset(); } }, [state]);
  return <form action={action} ref={formRef} className="form-grid"><div className="field"><label htmlFor="subject-name">Полное название</label><input className="input" id="subject-name" name="name" required /></div><div className="field"><label htmlFor="short-name">Короткое название</label><input className="input" id="short-name" name="shortName" required /></div><div className="field"><label htmlFor="teacher">Преподаватель</label><input className="input" id="teacher" name="teacher" /></div><div className="field" style={{ justifyContent: "end" }}><button className="button primary" disabled={pending}>{pending ? "Добавляем…" : "Добавить дисциплину"}</button></div>{state.error && <p className="form-error">{state.error}</p>}</form>;
}

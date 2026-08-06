"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowUpDown, Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { lessonTypeLabels, statusMeta, type AttendanceStatus, type LessonType } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";

type LessonRow = { id: string; date: string; type: LessonType; subjectId: string; subject: string; stats: { present: number; absent: number; late: number; excused: number } };
type Mark = { lessonId: string; studentId: string; studentName: string; status: AttendanceStatus };

export function JournalView({ rows, marks, students }: { rows: LessonRow[]; marks: Mark[]; students: { id: string; name: string }[] }) {
  const [view, setView] = useState<"lessons" | "matrix">("lessons");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [absencesOnly, setAbsencesOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const subjects = useMemo(() => [...new Map(rows.map((row) => [row.subjectId, row.subject])).entries()], [rows]);
  // TanStack Table treats a new data reference as a data update. Keeping this
  // array stable prevents a render/update loop after the journal hydrates.
  const filtered = useMemo(
    () => rows.filter((row) => (!subject || row.subjectId === subject) && (!type || row.type === type) && (!absencesOnly || row.stats.absent > 0)),
    [rows, subject, type, absencesOnly],
  );
  const columns = useMemo(() => [
    { accessorKey: "date", header: "Дата", cell: ({ row }: { row: { original: LessonRow } }) => formatDate(row.original.date) },
    { accessorKey: "subject", header: "Дисциплина", cell: ({ row }: { row: { original: LessonRow } }) => <strong>{row.original.subject}</strong> },
    { accessorKey: "type", header: "Тип", cell: ({ row }: { row: { original: LessonRow } }) => lessonTypeLabels[row.original.type] },
    { id: "marks", header: "П / Н / О / У", cell: ({ row }: { row: { original: LessonRow } }) => <span className="count-row"><span className="count-pill">П {row.original.stats.present}</span><span className="count-pill">Н {row.original.stats.absent}</span><span className="count-pill">О {row.original.stats.late}</span><span className="count-pill">У {row.original.stats.excused}</span></span> },
    { id: "action", header: "", cell: ({ row }: { row: { original: LessonRow } }) => <Link className="button" href={`/lessons/${row.original.id}/edit`}>Изменить</Link> },
  ], []);
  const table = useReactTable({ data: filtered, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return <>
    <div className="filters"><button className={`button ${view === "lessons" ? "primary" : ""}`} onClick={() => setView("lessons")}><List size={17} />Занятия</button><button className={`button ${view === "matrix" ? "primary" : ""}`} onClick={() => setView("matrix")}><Grid3X3 size={17} />Сводная</button>
      <select className="input" aria-label="Дисциплина" value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">Все дисциплины</option>{subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select className="input" aria-label="Тип занятия" value={type} onChange={(event) => setType(event.target.value)}><option value="">Все типы</option>{Object.entries(lessonTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      <label className="button"><input type="checkbox" checked={absencesOnly} onChange={(event) => setAbsencesOnly(event.target.checked)} />Есть пропуски</label>
    </div>
    {view === "lessons" ? <section className="card">{filtered.length === 0 ? <div className="empty"><SlidersHorizontal size={28} style={{ margin: "0 auto 10px" }} />По выбранным фильтрам ничего не найдено</div> : <><div className="table-wrap desktop-table"><table><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}><button type="button" style={{ display: "flex", gap: 5, alignItems: "center" }} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getCanSort() && <ArrowUpDown size={13} />}</button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
      <div className="mobile-cards">{filtered.map((lesson) => <Link href={`/lessons/${lesson.id}/edit`} className="mobile-card" key={lesson.id}><div className="mobile-card-top"><strong>{lesson.subject}</strong><span>{formatDate(lesson.date)}</span></div><div className="mobile-card-meta"><span>{lessonTypeLabels[lesson.type]}</span><span>П {lesson.stats.present} · Н {lesson.stats.absent} · О {lesson.stats.late} · У {lesson.stats.excused}</span></div></Link>)}</div></>}</section> : <Matrix rows={filtered} marks={marks} students={students} />}
  </>;
}

function Matrix({ rows, marks, students }: { rows: LessonRow[]; marks: Mark[]; students: { id: string; name: string }[] }) {
  const markIndex = useMemo(() => new Map(marks.map((mark) => [`${mark.lessonId}:${mark.studentId}`, mark.status])), [marks]);
  return <section className="card"><div className="table-wrap desktop-table"><table><thead><tr><th>Студент</th>{rows.slice(0, 12).map((lesson) => <th key={lesson.id} title={`${lesson.subject}, ${formatDate(lesson.date)}`}>{lesson.subject}<br />{lesson.date.slice(5)}</th>)}</tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td>{rows.slice(0, 12).map((lesson) => { const status = markIndex.get(`${lesson.id}:${student.id}`); return <td key={lesson.id}>{status ? <StatusBadge status={status} compact /> : "—"}</td>; })}</tr>)}</tbody></table></div>
    <div className="mobile-cards">{students.map((student) => <article className="mobile-card" key={student.id}><strong>{student.name}</strong><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{rows.slice(0, 8).map((lesson) => { const status = markIndex.get(`${lesson.id}:${student.id}`); return <div key={lesson.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span className="muted">{lesson.subject} · {lesson.date.slice(5)}</span>{status ? <StatusBadge status={status} /> : "—"}</div>; })}</div></article>)}</div>
    <div className="card-body muted">Обозначения: {Object.values(statusMeta).map((meta) => `${meta.short} — ${meta.label.toLowerCase()}`).join("; ")}.</div>
  </section>;
}

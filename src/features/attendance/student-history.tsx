"use client";

import { useState } from "react";
import { FilterX } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { lessonTypeLabels, statusMeta, type AttendanceStatus, type LessonType } from "@/lib/constants";

type Row = { id: string; status: AttendanceStatus; date: string; type: LessonType; subject: string };

export function StudentHistory({ rows }: { rows: Row[] }) {
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [onlyAbsences, setOnlyAbsences] = useState(false);
  const subjects = [...new Set(rows.map((row) => row.subject))];
  const filtered = rows.filter((row) => (!subject || row.subject === subject) && (!status || row.status === status) && (!onlyAbsences || row.status === "absent"));
  return <><div className="filters"><select className="input" value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Фильтр по дисциплине"><option value="">Все дисциплины</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select><select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Фильтр по статусу"><option value="">Все статусы</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select><label className="button"><input type="checkbox" checked={onlyAbsences} onChange={(event) => setOnlyAbsences(event.target.checked)} />Только пропуски</label></div>
    <section className="card">{filtered.length === 0 ? <div className="empty"><FilterX size={28} style={{ margin: "0 auto 10px" }} />По выбранным фильтрам записей нет</div> : <><div className="table-wrap desktop-table"><table><thead><tr><th>Дата</th><th>Дисциплина</th><th>Тип</th><th>Статус</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{formatDate(row.date)}</td><td><strong>{row.subject}</strong></td><td>{lessonTypeLabels[row.type]}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div><div className="mobile-cards">{filtered.map((row) => <article className="mobile-card" key={row.id}><div className="mobile-card-top"><strong>{row.subject}</strong><StatusBadge status={row.status} /></div><div className="mobile-card-meta"><span>{formatDate(row.date)}</span><span>{lessonTypeLabels[row.type]}</span></div></article>)}</div></>}</section></>;
}

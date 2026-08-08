"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  getIndividualAttendanceSummary,
  sortIndividualAttendanceRows,
  type IndividualAttendanceRow,
  type IndividualAttendanceSort,
  type IndividualSummaryLessonSource,
  type IndividualSummaryMemberSource,
} from "@/features/lessons/domain/individual-attendance-summary";
import type { AttendanceStatus } from "@/features/lessons/domain/lessons";
import { attendanceStatusCopy } from "@/features/lessons/presentation/lesson-copy";
import { formatMemberName } from "@/features/members/presentation/member-copy";
import { cn } from "@/lib/utils";

type SummaryView = "overall" | "disciplines";
type OverallSortField = "name" | "percentage" | AttendanceStatus;

export function IndividualAttendanceSummary({
  lessons,
  members,
}: {
  lessons: IndividualSummaryLessonSource[];
  members: IndividualSummaryMemberSource[];
}) {
  const [disciplineId, setDisciplineId] = useState("all");
  const [view, setView] = useState<SummaryView>("overall");
  const [overallSort, setOverallSort] = useState<IndividualAttendanceSort>({
    field: "name",
    direction: "asc",
  });
  const [disciplineSort, setDisciplineSort] =
    useState<IndividualAttendanceSort>({ field: "name", direction: "asc" });
  const disciplineOptions = useMemo(
    () =>
      [
        ...new Map(
          lessons.map(({ discipline }) => [discipline.publicId, discipline]),
        ).values(),
      ].toSorted(
        (left, right) =>
          disciplineCollator.compare(left.name, right.name) ||
          left.publicId.localeCompare(right.publicId),
      ),
    [lessons],
  );
  const visibleLessons = useMemo(
    () =>
      disciplineId === "all"
        ? lessons
        : lessons.filter(
            ({ discipline }) => discipline.publicId === disciplineId,
          ),
    [disciplineId, lessons],
  );
  const summary = useMemo(
    () => getIndividualAttendanceSummary(visibleLessons, members),
    [members, visibleLessons],
  );
  const effectiveView = disciplineId === "all" ? view : "overall";
  const rows = useMemo(
    () =>
      sortIndividualAttendanceRows(
        summary.rows,
        effectiveView === "overall" ? overallSort : disciplineSort,
      ),
    [disciplineSort, effectiveView, overallSort, summary.rows],
  );

  function sortOverallBy(field: OverallSortField) {
    setOverallSort((current) => nextSort(current, field));
  }

  function sortByDiscipline(targetDisciplineId: string) {
    setDisciplineSort((current) =>
      current.field === "discipline" &&
      current.disciplineId === targetDisciplineId
        ? { ...current, direction: oppositeDirection(current.direction) }
        : {
            field: "discipline",
            disciplineId: targetDisciplineId,
            direction: "desc",
          },
    );
  }

  return (
    <section className="space-y-5" aria-label="Индивидуальная сводка посещаемости">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full max-w-sm text-sm font-medium">
          Дисциплина
          <NativeSelect
            className="mt-2"
            value={disciplineId}
            onChange={(event) => setDisciplineId(event.target.value)}
          >
            <option value="all">Все дисциплины</option>
            {disciplineOptions.map((discipline) => (
              <option key={discipline.publicId} value={discipline.publicId}>
                {discipline.name}
              </option>
            ))}
          </NativeSelect>
        </label>

        {disciplineOptions.length > 0 ? (
          <div
            className="inline-flex w-fit rounded-sm border bg-card p-1"
            role="group"
            aria-label="Представление сводной"
          >
            <Button
              type="button"
              size="sm"
              variant={effectiveView === "overall" ? "secondary" : "ghost"}
              aria-pressed={effectiveView === "overall"}
              onClick={() => setView("overall")}
            >
              Общая
            </Button>
            <Button
              type="button"
              size="sm"
              variant={effectiveView === "disciplines" ? "secondary" : "ghost"}
              aria-pressed={effectiveView === "disciplines"}
              disabled={disciplineId !== "all"}
              title={
                disciplineId === "all"
                  ? undefined
                  : "Доступно при выборе всех дисциплин"
              }
              onClick={() => setView("disciplines")}
            >
              По дисциплинам
            </Button>
          </div>
        ) : null}
      </div>

      {!summary.hasData ? (
        <SummaryEmptyState disciplineSelected={disciplineId !== "all"} />
      ) : effectiveView === "overall" ? (
        <OverallSummaryTable
          rows={rows}
          sort={overallSort}
          onSort={sortOverallBy}
        />
      ) : (
        <DisciplineSummaryTable
          rows={rows}
          disciplines={summary.disciplines}
          sort={disciplineSort}
          onSortName={() =>
            setDisciplineSort((current) => nextSort(current, "name"))
          }
          onSortDiscipline={sortByDiscipline}
        />
      )}
    </section>
  );
}

function OverallSummaryTable({
  rows,
  sort,
  onSort,
}: {
  rows: IndividualAttendanceRow[];
  sort: IndividualAttendanceSort;
  onSort: (field: OverallSortField) => void;
}) {
  return (
    <SummaryTableFrame label="Общая сводная посещаемости">
      <table className="w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <SortableHeader
              label="Студент"
              active={sort.field === "name"}
              direction={sort.direction}
              onClick={() => onSort("name")}
              sticky
            />
            <SortableHeader
              label="Посещаемость"
              active={sort.field === "percentage"}
              direction={sort.direction}
              onClick={() => onSort("percentage")}
            />
            <th className={cn(headerClassName, "whitespace-nowrap px-3")} scope="col">
              Посещено
            </th>
            {statusColumns.map((status) => (
              <SortableHeader
                key={status}
                label={attendanceStatusCopy[status]}
                active={sort.field === status}
                direction={sort.direction}
                onClick={() => onSort(status)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.member.publicId}>
              <MemberCell row={row} />
              <td className={metricCellClassName}>
                {row.summary.percentage === null ? (
                  <span className="text-muted-foreground">Нет данных</span>
                ) : (
                  <span className="font-semibold">{row.summary.percentage}%</span>
                )}
              </td>
              <td className={metricCellClassName}>
                {row.summary.total === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span>
                    {row.summary.attended} из {row.summary.total}
                  </span>
                )}
              </td>
              {statusColumns.map((status) => (
                <td key={status} className={metricCellClassName}>
                  {row.summary.total === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.summary.counts[status]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryTableFrame>
  );
}

function DisciplineSummaryTable({
  rows,
  disciplines,
  sort,
  onSortName,
  onSortDiscipline,
}: {
  rows: IndividualAttendanceRow[];
  disciplines: IndividualSummaryLessonSource["discipline"][];
  sort: IndividualAttendanceSort;
  onSortName: () => void;
  onSortDiscipline: (disciplineId: string) => void;
}) {
  return (
    <SummaryTableFrame label="Сводная посещаемости по дисциплинам">
      <table className="w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <SortableHeader
              label="Студент"
              active={sort.field === "name"}
              direction={sort.direction}
              onClick={onSortName}
              sticky
            />
            {disciplines.map((discipline) => (
              <SortableHeader
                key={discipline.publicId}
                label={discipline.name}
                active={
                  sort.field === "discipline" &&
                  sort.disciplineId === discipline.publicId
                }
                direction={sort.direction}
                onClick={() => onSortDiscipline(discipline.publicId)}
                discipline
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.member.publicId}>
              <MemberCell row={row} />
              {disciplines.map((discipline) => {
                const totals = row.byDiscipline.find(
                  (candidate) =>
                    candidate.discipline.publicId === discipline.publicId,
                );
                return (
                  <td
                    key={discipline.publicId}
                    className="min-w-32 max-w-40 border-r border-b px-3 py-3 text-center align-middle tabular-nums last:border-r-0"
                  >
                    {totals?.percentage === null || !totals ? (
                      <span className="text-muted-foreground" title="Нет данных">
                        —
                      </span>
                    ) : (
                      <span className="inline-flex flex-col items-center leading-tight">
                        <span className="font-semibold">{totals.percentage}%</span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {totals.attended} из {totals.total}
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryTableFrame>
  );
}

function SummaryTableFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="w-fit max-w-full overflow-x-auto rounded-md border bg-card"
      tabIndex={0}
      aria-label={`${label}. Таблица прокручивается по горизонтали.`}
    >
      {children}
    </div>
  );
}

function MemberCell({ row }: { row: IndividualAttendanceRow }) {
  const fullName = formatMemberName(row.member);
  return (
    <th
      scope="row"
      className="sticky left-0 z-10 w-px border-r border-b bg-card px-3 py-3 text-left align-middle font-medium"
    >
      <span
        className="line-clamp-2 w-max max-w-56 whitespace-normal leading-snug"
        title={fullName}
      >
        {fullName}
      </span>
      {!row.member.isActive ? (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Неактивен
        </span>
      ) : null}
    </th>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
  sticky = false,
  discipline = false,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  sticky?: boolean;
  discipline?: boolean;
}) {
  const Icon = !active
    ? ChevronsUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : undefined
      }
      className={cn(
        headerClassName,
        sticky &&
          "sticky left-0 z-20 w-px border-r text-left",
        discipline && "min-w-32 max-w-40",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
          sticky && "justify-start",
          discipline && "leading-snug whitespace-normal",
        )}
        onClick={onClick}
      >
        <span className={cn(discipline && "line-clamp-2")}>{label}</span>
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-primary" : "text-muted-foreground",
          )}
        />
      </button>
    </th>
  );
}

function SummaryEmptyState({
  disciplineSelected,
}: {
  disciplineSelected: boolean;
}) {
  return (
    <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">
        Данных для сводной пока нет
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {disciplineSelected
          ? "По выбранной дисциплине нет полностью завершённых занятий с отметками посещаемости."
          : "Сводная появится после полного заполнения посещаемости хотя бы одного занятия в выбранном периоде."}
      </p>
    </div>
  );
}

function nextSort(
  current: IndividualAttendanceSort,
  field: OverallSortField,
): IndividualAttendanceSort {
  if (current.field === field) {
    return { field, direction: oppositeDirection(current.direction) };
  }
  return { field, direction: field === "name" ? "asc" : "desc" };
}

function oppositeDirection(direction: "asc" | "desc") {
  return direction === "asc" ? "desc" : "asc";
}

const statusColumns: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
];

const headerClassName =
  "border-b bg-surface-subtle p-0 text-center align-middle font-medium";
const metricCellClassName =
  "border-r border-b px-3 py-3 text-center align-middle whitespace-nowrap tabular-nums last:border-r-0";
const disciplineCollator = new Intl.Collator("ru", {
  sensitivity: "base",
  numeric: true,
});

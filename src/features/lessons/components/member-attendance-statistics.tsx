"use client";

import { useMemo, useState } from "react";

import { NativeSelect } from "@/components/ui/native-select";
import {
  AttendanceStatusBreakdown,
  AttendanceStatusDistribution,
} from "@/features/lessons/components/attendance-status-summary";
import {
  getMemberAttendanceStatistics,
  type AttendanceSummary,
  type MemberAttendanceStatisticsSource,
} from "@/features/lessons/domain/member-attendance-statistics";

export function MemberAttendanceStatistics({
  items,
}: {
  items: MemberAttendanceStatisticsSource[];
}) {
  const [disciplineId, setDisciplineId] = useState("all");
  const allStatistics = useMemo(
    () => getMemberAttendanceStatistics(items),
    [items],
  );
  const visibleItems = useMemo(
    () =>
      disciplineId === "all"
        ? items
        : items.filter(
            ({ discipline }) => discipline.publicId === disciplineId,
          ),
    [disciplineId, items],
  );
  const summary = useMemo(
    () =>
      disciplineId === "all"
        ? allStatistics.summary
        : getMemberAttendanceStatistics(visibleItems).summary,
    [allStatistics.summary, disciplineId, visibleItems],
  );

  return (
    <section className="space-y-4" aria-label="Статистика посещаемости">
      <label className="block max-w-sm text-sm font-medium">
        Дисциплина
        <NativeSelect
          className="mt-2"
          value={disciplineId}
          onChange={(event) => setDisciplineId(event.target.value)}
        >
          <option value="all">Все дисциплины</option>
          {allStatistics.byDiscipline.map(({ discipline }) => (
            <option key={discipline.publicId} value={discipline.publicId}>
              {discipline.name}
            </option>
          ))}
        </NativeSelect>
      </label>

      {summary.percentage === null ? (
        <StatisticsEmptyState />
      ) : (
        <>
          <AttendanceSummaryCard summary={summary} />

          {disciplineId === "all" ? (
            <section className="space-y-3" aria-labelledby="discipline-statistics-title">
              <h2
                id="discipline-statistics-title"
                className="font-heading text-lg font-semibold"
              >
                По дисциплинам
              </h2>
              <div className="divide-y rounded-md border bg-card">
                {allStatistics.byDiscipline.map((disciplineSummary) => (
                  <article
                    key={disciplineSummary.discipline.publicId}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5"
                  >
                    <h3 className="min-w-0 break-words text-sm leading-snug font-medium">
                      {disciplineSummary.discipline.name}
                    </h3>
                    <p className="tabular-nums text-2xl font-semibold sm:text-xl">
                      {disciplineSummary.percentage}%
                    </p>
                    <p className="tabular-nums text-sm text-muted-foreground sm:min-w-20 sm:text-right">
                      {disciplineSummary.attended} из {disciplineSummary.total}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

function AttendanceSummaryCard({ summary }: { summary: AttendanceSummary }) {
  return (
    <section className="rounded-md border bg-card" aria-labelledby="attendance-summary-title">
      <div className="p-5 sm:p-6">
        <h2
          id="attendance-summary-title"
          className="font-heading text-lg font-semibold"
        >
          Посещаемость
        </h2>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="tabular-nums font-heading text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
            {summary.percentage}%
          </p>
          <p className="pb-1 text-sm text-muted-foreground sm:text-base">
            посещено {summary.attended} из {summary.total} занятий
          </p>
        </div>

        <div className="mt-5">
          <AttendanceStatusDistribution counts={summary.counts} />
        </div>
      </div>

      <AttendanceStatusBreakdown counts={summary.counts} />
    </section>
  );
}

function StatisticsEmptyState() {
  return (
    <div data-surface="subtle" className="rounded-md bg-surface-subtle p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">
        Данных для статистики пока недостаточно
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Статистика появится после завершения занятий с участием этого студента.
      </p>
    </div>
  );
}

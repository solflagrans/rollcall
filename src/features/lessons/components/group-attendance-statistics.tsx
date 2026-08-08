"use client";

import { useMemo, useState } from "react";

import { NativeSelect } from "@/components/ui/native-select";
import {
  AttendanceStatusBreakdown,
  AttendanceStatusDistribution,
} from "@/features/lessons/components/attendance-status-summary";
import {
  getGroupAttendanceStatistics,
  type GroupAttendanceSummary,
  type GroupStatisticsLessonSource,
} from "@/features/lessons/domain/group-attendance-statistics";

export function GroupAttendanceStatistics({
  lessons,
}: {
  lessons: GroupStatisticsLessonSource[];
}) {
  const [disciplineId, setDisciplineId] = useState("all");
  const allStatistics = useMemo(
    () => getGroupAttendanceStatistics(lessons),
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
    () =>
      disciplineId === "all"
        ? allStatistics.summary
        : getGroupAttendanceStatistics(visibleLessons).summary,
    [allStatistics.summary, disciplineId, visibleLessons],
  );

  return (
    <section className="space-y-4" aria-label="Статистика посещаемости группы">
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
        <GroupStatisticsEmptyState />
      ) : (
        <>
          <GroupAttendanceSummaryCard summary={summary} />

          {disciplineId === "all" ? (
            <section
              className="space-y-3"
              aria-labelledby="group-discipline-statistics-title"
            >
              <h2
                id="group-discipline-statistics-title"
                className="font-heading text-lg font-semibold"
              >
                По дисциплинам
              </h2>
              <div className="divide-y rounded-md border bg-card">
                {allStatistics.byDiscipline.map((disciplineSummary) => (
                  <article
                    key={disciplineSummary.discipline.publicId}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5"
                  >
                    <h3
                      className="min-w-0 truncate text-sm font-medium"
                      title={disciplineSummary.discipline.name}
                    >
                      {disciplineSummary.discipline.name}
                    </h3>
                    <p className="tabular-nums text-2xl font-semibold sm:text-xl">
                      {disciplineSummary.percentage === null
                        ? "—"
                        : `${disciplineSummary.percentage}%`}
                    </p>
                    <p className="tabular-nums text-sm text-muted-foreground sm:min-w-24 sm:text-right">
                      {formatLessonCount(disciplineSummary.lessonCount)}
                    </p>
                    <p className="tabular-nums text-sm text-muted-foreground sm:min-w-28 sm:text-right">
                      {disciplineSummary.attended} из {disciplineSummary.total}{" "}
                      отметок
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

function GroupAttendanceSummaryCard({
  summary,
}: {
  summary: GroupAttendanceSummary;
}) {
  return (
    <section
      className="rounded-md border bg-card"
      aria-labelledby="group-attendance-summary-title"
    >
      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
        <div className="min-w-0">
          <h2
            id="group-attendance-summary-title"
            className="font-heading text-lg font-semibold"
          >
            Посещаемость группы
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="tabular-nums font-heading text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
              {summary.percentage}%
            </p>
            <p className="pb-1 text-sm text-muted-foreground sm:text-base">
              {summary.attended} из {summary.total} отметок — посещение
            </p>
          </div>
        </div>

        <div className="rounded-sm bg-surface-subtle p-4">
          <p className="text-sm text-muted-foreground">В среднем на занятии</p>
          <p className="tabular-nums mt-2 text-3xl leading-none font-semibold">
            {formatAverage(summary.averageAttendedPerLesson ?? 0)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">присутствующих</p>
        </div>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <AttendanceStatusDistribution counts={summary.counts} />
      </div>
      <AttendanceStatusBreakdown counts={summary.counts} />
    </section>
  );
}

function GroupStatisticsEmptyState() {
  return (
    <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">
        Данных для статистики пока недостаточно
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Статистика появится после завершения занятий в выбранной выборке.
      </p>
    </div>
  );
}

function formatAverage(value: number) {
  return averageNumberFormat.format(value);
}

function formatLessonCount(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const noun =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "занятий"
      : lastDigit === 1
        ? "занятие"
        : lastDigit >= 2 && lastDigit <= 4
          ? "занятия"
          : "занятий";
  return `${count} ${noun}`;
}

const averageNumberFormat = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

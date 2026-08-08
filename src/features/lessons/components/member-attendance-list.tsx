"use client";

import { MessageSquareText, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCalendarDate } from "@/features/groups/presentation/period-copy";
import type {
  AttendanceStatus,
  LessonType,
} from "@/features/lessons/domain/lessons";
import {
  attendanceStatusCopy,
  lessonTypeCopy,
} from "@/features/lessons/presentation/lesson-copy";
import { cn } from "@/lib/utils";

type AttendanceItem = {
  publicId: string;
  lessonDate: string;
  lessonType: LessonType;
  discipline: {
    publicId: string;
    name: string;
  };
  status: AttendanceStatus;
  comment: string | null;
};

export function MemberAttendanceList({
  items,
  emptyMessage,
}: {
  items: AttendanceItem[];
  emptyMessage: string;
}) {
  const [disciplineId, setDisciplineId] = useState("all");
  const disciplines = useMemo(
    () =>
      [
        ...new Map(
          items.map(({ discipline }) => [discipline.publicId, discipline]),
        ).values(),
      ].toSorted((left, right) => left.name.localeCompare(right.name, "ru")),
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

  if (items.length === 0) {
    return <AttendanceEmptyState message={emptyMessage} />;
  }

  return (
    <section className="space-y-4" aria-label="Личная посещаемость">
      <label className="block max-w-sm text-sm font-medium">
        Дисциплина
        <NativeSelect
          className="mt-2"
          value={disciplineId}
          onChange={(event) => setDisciplineId(event.target.value)}
        >
          <option value="all">Все дисциплины</option>
          {disciplines.map((discipline) => (
            <option key={discipline.publicId} value={discipline.publicId}>
              {discipline.name}
            </option>
          ))}
        </NativeSelect>
      </label>

      {visibleItems.length === 0 ? (
        <AttendanceEmptyState message="По выбранной дисциплине доступных занятий нет." />
      ) : (
        <div className="rounded-md border bg-card">
          <div className="hidden grid-cols-[9rem_minmax(0,1fr)_10rem_10rem_2.75rem] gap-4 border-b bg-surface-subtle px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span>Дата</span>
            <span>Дисциплина</span>
            <span>Тип занятия</span>
            <span>Статус</span>
            <span className="sr-only">Комментарий</span>
          </div>
          <div className="divide-y">
            {visibleItems.map((item) => (
              <AttendanceRow key={item.publicId} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AttendanceRow({ item }: { item: AttendanceItem }) {
  const lessonDescription = `${formatCalendarDate(item.lessonDate)}, ${item.discipline.name}, ${lessonTypeCopy[item.lessonType]}`;

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[9rem_minmax(0,1fr)_10rem_10rem_2.75rem] md:items-center md:gap-4">
      <time
        dateTime={item.lessonDate}
        className="tabular-nums col-start-1 row-start-1 text-sm text-muted-foreground md:col-auto md:row-auto md:text-foreground"
      >
        {formatCalendarDate(item.lessonDate)}
      </time>
      <p className="col-start-1 row-start-2 min-w-0 text-sm leading-snug font-medium md:col-auto md:row-auto">
        {item.discipline.name}
      </p>
      <p className="col-start-1 row-start-3 text-sm text-muted-foreground md:col-auto md:row-auto">
        {lessonTypeCopy[item.lessonType]}
      </p>
      <span
        className={cn(
          "col-start-2 row-start-1 row-span-2 inline-flex min-h-8 shrink-0 items-center self-center rounded-full border px-3 text-sm font-medium md:col-auto md:row-auto md:row-span-1 md:justify-self-start",
          statusClass[item.status],
        )}
      >
        {attendanceStatusCopy[item.status]}
      </span>
      <div className="col-start-2 row-start-3 justify-self-end md:col-auto md:row-auto md:justify-self-center">
        {item.comment ? (
          <AttendanceComment
            comment={item.comment}
            lessonDescription={lessonDescription}
          />
        ) : (
          <span className="block size-8" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

function AttendanceComment({
  comment,
  lessonDescription,
}: {
  comment: string;
  lessonDescription: string;
}) {
  const [presentation, setPresentation] = useState<"desktop" | "mobile">();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const open = Boolean(presentation);

  useEffect(() => {
    if (presentation !== "desktop") return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPresentation(undefined);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPresentation(undefined);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [presentation]);

  const close = () => setPresentation(undefined);

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="text-primary md:size-8"
        aria-label="Показать комментарий старосты"
        aria-expanded={open}
        aria-controls={presentation === "desktop" ? popoverId : undefined}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setPresentation(
            window.matchMedia("(min-width: 768px)").matches
              ? "desktop"
              : "mobile",
          );
        }}
      >
        <MessageSquareText aria-hidden="true" />
      </Button>

      {presentation === "desktop" ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Комментарий старосты"
          className="absolute right-0 bottom-full z-30 mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-card p-4 text-left shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">
                Комментарий старосты
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {lessonDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Закрыть комментарий"
              onClick={close}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{comment}</p>
        </div>
      ) : null}

      <Dialog
        open={presentation === "mobile"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
        title="Комментарий старосты"
        description={lessonDescription}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{comment}</p>
      </Dialog>
    </div>
  );
}

function AttendanceEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">
        Доступных отметок пока нет
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

const statusClass: Record<AttendanceStatus, string> = {
  present:
    "border-status-present-border bg-status-present-background text-status-present-foreground",
  late: "border-status-late-border bg-status-late-background text-status-late-foreground",
  absent:
    "border-status-absent-border bg-status-absent-background text-status-absent-foreground",
  excused:
    "border-status-excused-border bg-status-excused-background text-status-excused-foreground",
};

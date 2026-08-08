import type {
  PeriodStatus,
  PeriodType,
} from "@/features/groups/domain/periods";

export const periodTypeCopy: Record<
  PeriodType,
  {
    singular: string;
    plural: string;
    numberLabel: string;
    newAction: string;
    createAction: string;
    editAction: string;
    createdNotice: string;
    updatedNotice: string;
    notFoundNotice: string;
  }
> = {
  semester: {
    singular: "Семестр",
    plural: "Семестры",
    numberLabel: "Номер семестра",
    newAction: "Новый семестр",
    createAction: "Создать семестр",
    editAction: "Изменить семестр",
    createdNotice: "Семестр создан",
    updatedNotice: "Семестр обновлён",
    notFoundNotice: "Семестр не найден. Открыта страница группы.",
  },
  trimester: {
    singular: "Триместр",
    plural: "Триместры",
    numberLabel: "Номер триместра",
    newAction: "Новый триместр",
    createAction: "Создать триместр",
    editAction: "Изменить триместр",
    createdNotice: "Триместр создан",
    updatedNotice: "Триместр обновлён",
    notFoundNotice: "Триместр не найден. Открыта страница группы.",
  },
  quarter: {
    singular: "Четверть",
    plural: "Четверти",
    numberLabel: "Номер четверти",
    newAction: "Новая четверть",
    createAction: "Создать четверть",
    editAction: "Изменить четверть",
    createdNotice: "Четверть создана",
    updatedNotice: "Четверть обновлена",
    notFoundNotice: "Четверть не найдена. Открыта страница группы.",
  },
  year: {
    singular: "Учебный год",
    plural: "Учебные годы",
    numberLabel: "Номер учебного года",
    newAction: "Новый учебный год",
    createAction: "Создать учебный год",
    editAction: "Изменить учебный год",
    createdNotice: "Учебный год создан",
    updatedNotice: "Учебный год обновлён",
    notFoundNotice: "Учебный год не найден. Открыта страница группы.",
  },
};

export const periodStatusLabels: Record<PeriodStatus, string> = {
  upcoming: "Предстоящий",
  current: "Текущий",
  completed: "Завершённый",
};

export function formatPeriodName(periodType: PeriodType, number: number): string {
  return `${number} ${periodTypeCopy[periodType].singular}`;
}

export function formatCalendarDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

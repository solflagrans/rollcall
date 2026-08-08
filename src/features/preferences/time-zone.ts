export const USER_TIME_ZONE_COOKIE = "rollcall-time-zone";
export const FALLBACK_TIME_ZONE = "UTC";

export function isSupportedTimeZone(value: string | undefined): value is string {
  if (!value || value.length > 64) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getCalendarDateInTimeZone(
  timeZone: string,
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

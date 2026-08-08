import "server-only";

import { cookies } from "next/headers";

import {
  FALLBACK_TIME_ZONE,
  getCalendarDateInTimeZone,
  isSupportedTimeZone,
  USER_TIME_ZONE_COOKIE,
} from "@/features/preferences/time-zone";

export async function getUserTimeZone(): Promise<string> {
  const value = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  return isSupportedTimeZone(value) ? value : FALLBACK_TIME_ZONE;
}

export async function getUserToday(now = new Date()): Promise<string> {
  return getCalendarDateInTimeZone(await getUserTimeZone(), now);
}

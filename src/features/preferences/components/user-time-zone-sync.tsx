"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  isSupportedTimeZone,
  USER_TIME_ZONE_COOKIE,
} from "@/features/preferences/time-zone";

function readTimeZoneCookie(): string | undefined {
  const prefix = `${USER_TIME_ZONE_COOKIE}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

export function UserTimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isSupportedTimeZone(timeZone) || readTimeZoneCookie() === timeZone) return;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${USER_TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    router.refresh();
  }, [router]);

  return null;
}

"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "rollcall_chunk_recovery_at";
const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Failed to load module script/i;

function errorText(reason: unknown) {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  return String(reason ?? "");
}

export function ChunkRecovery() {
  useEffect(() => {
    const recover = (reason: unknown) => {
      if (!CHUNK_ERROR.test(errorText(reason))) return;
      const previous = Number(sessionStorage.getItem(RECOVERY_KEY) ?? 0);
      if (Date.now() - previous < 30_000) return;
      sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
      window.location.reload();
    };
    const onError = (event: ErrorEvent) => recover(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => recover(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

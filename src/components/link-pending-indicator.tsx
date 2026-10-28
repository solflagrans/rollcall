"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";

export function LinkPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-4 shrink-0 items-center justify-center ${
        pending ? "link-pending-visible" : "invisible opacity-0"
      }`}
    >
      <LoaderCircle className="size-3.5 animate-spin" />
    </span>
  );
}

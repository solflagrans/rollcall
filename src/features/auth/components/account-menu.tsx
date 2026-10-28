"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOutAction } from "@/features/auth/actions";
import type { AuthUserProfile } from "@/features/auth/domain/models";
import { cn } from "@/lib/utils";

const menuItemClassName =
  "flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-10";

export function AccountMenu({
  profile,
  placement = "header",
}: {
  profile: AuthUserProfile;
  placement?: "header" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative min-w-0", placement === "sidebar" && "w-full")}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size={placement === "sidebar" ? "default" : "icon"}
        className={cn(
          placement === "sidebar" && "h-auto min-h-11 w-full justify-center px-0 hover:bg-transparent",
          placement === "header" && "sm:h-10 sm:w-auto sm:px-3",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Аккаунт: ${fullName}`}
        onClick={() => setOpen((current) => !current)}
      >
        {placement === "sidebar" ? (
          <span className="truncate" title={fullName}>{fullName}</span>
        ) : (
          <>
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold sm:hidden">
              {initials || <UserRound aria-hidden="true" />}
            </span>
            <span className="hidden max-w-48 truncate sm:inline" title={fullName}>{fullName}</span>
          </>
        )}
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-40 w-64 max-w-[calc(100vw-2rem)] rounded-md border bg-card p-1 shadow-sm",
            placement === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 mt-2",
          )}
        >
          <div className="min-w-0 px-3 py-2">
            <p className="truncate text-sm font-medium" title={fullName}>{fullName}</p>
            <p
              className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
              title={profile.rollcallId}
            >
              {profile.rollcallId}
            </p>
          </div>
          <Separator className="my-1" />
          <Link
            href="/profile"
            role="menuitem"
            className={menuItemClassName}
            onClick={() => setOpen(false)}
          >
            <UserRound aria-hidden="true" className="size-4" />
            Профиль
          </Link>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={menuItemClassName}>
              <LogOut aria-hidden="true" className="size-4" />
              Выйти
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

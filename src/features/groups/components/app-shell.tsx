"use client";

import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { switchGroupAction } from "@/features/auth/actions";
import { AccountMenu } from "@/features/auth/components/account-menu";
import type { AuthUserProfile, UserMembership } from "@/features/auth/domain/models";
import { GroupSectionNav } from "@/features/groups/components/group-section-nav";
import { cn } from "@/lib/utils";

function AccountControls({
  profile,
  memberships,
  currentGroupId,
  compact = false,
  showCreateGroup = false,
  showThemeToggle = false,
}: {
  profile: AuthUserProfile;
  memberships: UserMembership[];
  currentGroupId?: string;
  compact?: boolean;
  showCreateGroup?: boolean;
  showThemeToggle?: boolean;
}) {
  const current = memberships.find(({ group }) => group.publicId === currentGroupId);
  return (
    <div className={cn("space-y-3", compact && "flex items-center gap-2 space-y-0")}>
      {memberships.length > 1 ? (
        <form action={switchGroupAction} className={cn("min-w-0", compact ? "w-32 sm:w-40" : "w-full")}>
          <label className={cn("block text-xs text-muted-foreground", compact && "sr-only")} htmlFor={compact ? "mobile-group" : "sidebar-group"}>
            Текущая группа
          </label>
          <NativeSelect
            id={compact ? "mobile-group" : "sidebar-group"}
            name="groupId"
            value={current?.group.publicId ?? memberships[0]?.group.publicId ?? ""}
            className={cn(!compact && "mt-2")}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            aria-label={compact ? "Текущая группа" : undefined}
          >
            {memberships.map(({ group }) => (
              <option key={group.id} value={group.publicId}>{group.name}</option>
            ))}
          </NativeSelect>
        </form>
      ) : current && compact ? (
        <p className="hidden truncate text-sm font-medium sm:block" title={current.group.name}>
          {current.group.name}
        </p>
      ) : null}

      <div className={cn("flex items-center justify-between gap-2", compact && "shrink-0")}>
        <div
          className={cn(
            "flex items-center gap-2",
            !compact && "w-full",
            compact && showCreateGroup && "gap-0",
          )}
        >
          {showCreateGroup ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/groups/new">Создать группу</Link>
            </Button>
          ) : null}
          <AccountMenu
            profile={profile}
            placement={compact ? "header" : "sidebar"}
          />
          {showThemeToggle ? <ThemeToggle /> : null}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: {
    profile: AuthUserProfile;
    memberships: UserMembership[];
  };
}) {
  const pathname = usePathname();
  const routeGroupId = pathname.match(/^\/groups\/([^/]+)/)?.[1];
  const groupId = routeGroupId && routeGroupId !== "new" ? routeGroupId : undefined;

  return (
    <div className="min-h-dvh w-full min-w-0 bg-background">
      <header
        className={cn(
          "sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur",
          groupId && "md:hidden",
        )}
      >
        <Link href="/groups" className="flex min-h-11 items-center gap-2 font-heading text-lg font-semibold">
          <BookOpenCheck aria-hidden="true" className="size-5 text-primary" />
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2">
          <AccountControls
            profile={viewer.profile}
            memberships={viewer.memberships}
            currentGroupId={groupId}
            compact
            showCreateGroup={pathname === "/groups"}
          />
          <ThemeToggle />
        </div>
      </header>

      {groupId ? (
        <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card md:flex md:flex-col">
          <Link href="/groups" className="flex h-20 items-center gap-3 px-6 font-heading text-xl font-semibold">
            <BookOpenCheck aria-hidden="true" className="size-6 text-primary" />
            {siteConfig.name}
          </Link>
          <Separator />
          <div className="flex-1 p-4">
            <GroupSectionNav groupId={groupId} placement="sidebar" />
          </div>
          <div className="border-t p-3">
            <AccountControls
              profile={viewer.profile}
              memberships={viewer.memberships}
              currentGroupId={groupId}
              showThemeToggle
            />
          </div>
        </aside>
      ) : null}

      <div className={cn("min-w-0", groupId && "md:pl-60")}>
        <main className="app-container py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

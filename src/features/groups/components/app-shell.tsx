"use client";

import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { GroupSectionNav } from "@/features/groups/components/group-section-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeGroupId = pathname.match(/^\/groups\/([^/]+)/)?.[1];
  const groupId = routeGroupId && routeGroupId !== "new" ? routeGroupId : undefined;

  return (
    <div className="min-h-dvh w-full min-w-0 bg-background">
      <header
        className={cn(
          "sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur",
          groupId && "md:hidden",
        )}
      >
        <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-lg font-semibold">
          <BookOpenCheck aria-hidden="true" className="size-5 text-primary" />
          {siteConfig.name}
        </Link>
        <ThemeToggle />
      </header>

      {groupId ? (
        <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card md:flex md:flex-col">
          <Link href="/" className="flex h-20 items-center gap-3 px-6 font-heading text-xl font-semibold">
            <BookOpenCheck aria-hidden="true" className="size-6 text-primary" />
            {siteConfig.name}
          </Link>
          <Separator />
          <div className="flex-1 p-4">
            <GroupSectionNav groupId={groupId} placement="sidebar" />
          </div>
          <div className="flex items-center justify-between border-t p-4">
            <span className="text-sm text-muted-foreground">Тема</span>
            <ThemeToggle />
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

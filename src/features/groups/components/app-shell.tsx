import { BookOpenCheck, UsersRound } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-lg font-semibold">
          <BookOpenCheck aria-hidden="true" className="size-5 text-primary" />
          {siteConfig.name}
        </Link>
        <ThemeToggle />
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card md:flex md:flex-col">
        <Link href="/" className="flex h-20 items-center gap-3 px-6 font-heading text-xl font-semibold">
          <BookOpenCheck aria-hidden="true" className="size-6 text-primary" />
          {siteConfig.name}
        </Link>
        <Separator />
        <nav aria-label="Основная навигация" className="flex-1 p-4">
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-sm bg-accent px-3 text-sm font-medium text-accent-foreground"
          >
            <UsersRound aria-hidden="true" className="size-5" />
            Группа
          </Link>
        </nav>
        <div className="flex items-center justify-between border-t p-4">
          <span className="text-sm text-muted-foreground">Тема</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="md:pl-60">
        <main className="app-container py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

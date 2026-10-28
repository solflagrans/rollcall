import { BookOpenCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-lg font-semibold">
          <BookOpenCheck aria-hidden="true" className="size-5 text-primary" />
          {siteConfig.name}
        </Link>
        <ThemeToggle />
      </header>
      <main className="app-container flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
        <section
          data-surface="raised"
          className="w-full max-w-md rounded-md border bg-card p-5 shadow-xs sm:p-8"
        >
          {children}
        </section>
      </main>
    </div>
  );
}

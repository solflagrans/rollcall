import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="app-container flex min-h-dvh items-center py-12">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">Страница не найдена</h1>
        <p className="mt-3 text-muted-foreground">
          Возможно, группа или учебный период больше не доступны.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Вернуться к группе</Link>
        </Button>
      </div>
    </main>
  );
}

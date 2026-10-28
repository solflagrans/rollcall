import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Загружаем данные"
      className="space-y-7"
    >
      <span className="sr-only">Загружаем данные…</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {!compact ? (
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-28" />
        </div>
      ) : null}
      <div className="space-y-3 rounded-md border bg-card p-5 shadow-xs sm:p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-4/5" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsLoading() {
  return (
    <div aria-label="Загрузка данных группы" className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-64 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-md" />
    </div>
  );
}

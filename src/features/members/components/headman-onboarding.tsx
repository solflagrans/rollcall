import { UserRoundCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HeadmanOnboarding({ groupId }: { groupId: string }) {
  return (
    <section className="rounded-md border bg-card p-6 sm:p-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UserRoundCheck aria-hidden="true" className="size-6" />
        </div>
        <h2 className="mt-5 font-heading text-xl font-semibold">Сначала добавьте старосту</h2>
        <p className="mt-3 text-muted-foreground">
          Староста создаётся отдельно. После этого можно будет добавить студентов и заместителей.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href={`/groups/${groupId}/members/new`}>Добавить старосту</Link>
        </Button>
      </div>
    </section>
  );
}

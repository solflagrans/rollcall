"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  acceptDirectInvitationAction,
  declineInvitationAction,
} from "@/features/invitations/actions";
import type { IncomingInvitation } from "@/features/invitations/domain/models";
import { useActionLock } from "@/lib/use-action-lock";

export function IncomingInvitations({ invitations }: { invitations: IncomingInvitation[] }) {
  const router = useRouter();
  const action = useActionLock();
  const [error, setError] = useState<string>();

  if (invitations.length === 0) return null;

  const run = async (invitationId: string, decision: "accept" | "decline") => {
    setError(undefined);
    const result = await action.run(() =>
      decision === "accept"
        ? acceptDirectInvitationAction(invitationId)
        : declineInvitationAction(invitationId),
    );
    if (!result) return;
    if (result.status === "error") setError(result.formError);
    else if (result.redirectTo) router.push(result.redirectTo);
    else router.refresh();
  };

  return (
    <section className="space-y-3" aria-labelledby="incoming-invitations-title">
      <div>
        <h2 id="incoming-invitations-title" className="font-heading text-xl font-semibold">Приглашения</h2>
        <p className="mt-1 text-sm text-muted-foreground">Подключение выполняется только после вашего подтверждения.</p>
      </div>
      {error ? <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y overflow-hidden rounded-md border bg-card">
        {invitations.map((invitation) => (
          <li key={invitation.publicId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{invitation.group.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Запись состава: {invitation.member.lastName} {invitation.member.firstName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={action.isLocked} onClick={() => void run(invitation.publicId, "accept")}>
                <Check aria-hidden="true" />
                Принять
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={action.isLocked} onClick={() => void run(invitation.publicId, "decline")}>
                <X aria-hidden="true" />
                Отклонить
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

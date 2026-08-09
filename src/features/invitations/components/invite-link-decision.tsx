"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { acceptLinkInvitationAction } from "@/features/invitations/actions";
import { useActionLock } from "@/lib/use-action-lock";

export function InviteLinkDecision({ token, disabled }: { token: string; disabled?: boolean }) {
  const router = useRouter();
  const action = useActionLock();
  const [error, setError] = useState<string>();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        disabled={disabled || action.isLocked}
        onClick={() => void action.run(async () => {
          setError(undefined);
          const result = await acceptLinkInvitationAction(token);
          if (result.status === "error") setError(result.formError);
          else if (result.redirectTo) router.push(result.redirectTo);
          return result;
        })}
      >
        <Check aria-hidden="true" />
        Принять приглашение
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

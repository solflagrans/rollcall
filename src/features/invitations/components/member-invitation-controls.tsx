"use client";

import { Copy, Link2, Send, UserPlus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createDirectInvitationAction,
  createLinkInvitationAction,
  getLinkInvitationAction,
  lookupInvitationProfileAction,
  revokeInvitationAction,
} from "@/features/invitations/actions";
import type { PublicInvitationProfile } from "@/features/invitations/domain/models";
import { FormField } from "@/features/groups/components/form-field";
import type { GroupMemberListItem } from "@/features/members/domain/members";
import { useActionLock } from "@/lib/use-action-lock";

type InvitationMemberView = Pick<
  GroupMemberListItem,
  | "publicId"
  | "firstName"
  | "lastName"
  | "isActive"
  | "connectedProfile"
  | "pendingInvitations"
> & { isConnected: boolean };

function CopyButton({ value, label = "Скопировать" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      <Copy aria-hidden="true" />
      {copied ? "Скопировано" : label}
    </Button>
  );
}

function InviteDialog({
  groupId,
  member,
  open,
  onOpenChange,
}: {
  groupId: string;
  member: InvitationMemberView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const request = useActionLock();
  const [rollcallId, setRollcallId] = useState("");
  const [profile, setProfile] = useState<PublicInvitationProfile>();
  const [invitePath, setInvitePath] = useState<string>();
  const [linkLoadFinished, setLinkLoadFinished] = useState(false);
  const [error, setError] = useState<string>();
  const pendingDirect = member.pendingInvitations.find(
    (invitation) => invitation.method === "rollcall_id",
  );
  const pendingLink = member.pendingInvitations.find(
    (invitation) => invitation.method === "link",
  );

  useEffect(() => {
    if (!open || !pendingLink || invitePath) return;
    let active = true;
    void getLinkInvitationAction(groupId, pendingLink.publicId).then((result) => {
      if (!active) return;
      setLinkLoadFinished(true);
      if (result.status === "error") setError(result.formError);
      else setInvitePath(result.invitePath);
    });
    return () => {
      active = false;
    };
  }, [groupId, invitePath, open, pendingLink]);

  const reset = () => {
    setRollcallId("");
    setProfile(undefined);
    setInvitePath(undefined);
    setLinkLoadFinished(false);
    setError(undefined);
  };

  const finish = (message?: string) => {
    if (message) setError(undefined);
    router.refresh();
    onOpenChange(false);
    reset();
  };

  const absoluteInviteUrl = invitePath
    ? typeof window === "undefined"
      ? invitePath
      : `${window.location.origin}${invitePath}`
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
      title="Пригласить участника"
      description={`${member.lastName} ${member.firstName}. Выберите персональный способ приглашения.`}
    >
      <div className="space-y-6">
        {error ? (
          <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="space-y-4">
          <div>
            <h3 className="font-medium">По Rollcall ID</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Сначала найдите профиль и проверьте имя владельца.
            </p>
          </div>
          {pendingDirect ? (
            <div className="space-y-3 rounded-md border bg-surface-subtle p-4">
              <div>
                <p className="text-sm font-medium">Приглашение ожидает ответа</p>
                {pendingDirect.targetProfile ? (
                  <>
                    <p className="mt-1 text-sm">
                      {pendingDirect.targetProfile.firstName} {pendingDirect.targetProfile.lastName}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {pendingDirect.targetProfile.rollcallId}
                    </p>
                  </>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={request.isLocked}
                onClick={() => {
                  if (!window.confirm("Отозвать приглашение по Rollcall ID?")) return;
                  void request.run(async () => {
                    const result = await revokeInvitationAction(groupId, pendingDirect.publicId);
                    if (result.status === "error") setError(result.formError);
                    else {
                      onOpenChange(false);
                      router.refresh();
                    }
                    return result;
                  });
                }}
              >
                <XCircle aria-hidden="true" />
                Отозвать приглашение
              </Button>
            </div>
          ) : (
            <>
              <FormField id={`rollcall-id-${member.publicId}`} label="Rollcall ID">
                <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`rollcall-id-${member.publicId}`}
                value={rollcallId}
                onChange={(event) => {
                  setRollcallId(event.target.value);
                  setProfile(undefined);
                }}
                placeholder="rc_…"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                disabled={request.isLocked || !rollcallId.trim()}
                onClick={() => void request.run(async () => {
                  setError(undefined);
                  const result = await lookupInvitationProfileAction(
                    groupId,
                    member.publicId,
                    rollcallId,
                  );
                  if (result.status === "error") setError(result.formError);
                  else setProfile(result.profile);
                  return result;
                })}
              >
                Найти
              </Button>
                </div>
              </FormField>

              {profile ? (
                <div className="space-y-3 rounded-md border bg-surface-subtle p-4">
                  <div>
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">{profile.rollcallId}</p>
                  </div>
                  <Button
                    type="button"
                    disabled={request.isLocked}
                    onClick={() => void request.run(async () => {
                      const result = await createDirectInvitationAction(
                        groupId,
                        member.publicId,
                        profile.rollcallId,
                      );
                      if (result.status === "error") setError(result.formError);
                      else finish(result.message);
                      return result;
                    })}
                  >
                    <Send aria-hidden="true" />
                    Отправить приглашение
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          или
        </div>

        <section className="space-y-4">
          <div>
            <h3 className="font-medium">Персональная ссылка</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ссылка действует 24 часа и подключает только эту запись состава после явного подтверждения.
            </p>
          </div>
          {absoluteInviteUrl ? (
            <div className="space-y-3 rounded-md border bg-surface-subtle p-4">
              <p className="break-all font-mono text-xs">{absoluteInviteUrl}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={absoluteInviteUrl} label="Скопировать ссылку" />
                {pendingLink ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={request.isLocked}
                    onClick={() => {
                      if (!window.confirm("Отозвать персональную ссылку? Она перестанет действовать.")) return;
                      void request.run(async () => {
                        const result = await revokeInvitationAction(groupId, pendingLink.publicId);
                        if (result.status === "error") setError(result.formError);
                        else {
                          setInvitePath(undefined);
                          onOpenChange(false);
                          router.refresh();
                        }
                        return result;
                      });
                    }}
                  >
                    <XCircle aria-hidden="true" />
                    Отозвать ссылку
                  </Button>
                ) : null}
              </div>
            </div>
          ) : pendingLink ? (
            <div className="space-y-3 rounded-md border bg-surface-subtle p-4">
              <p className="text-sm text-muted-foreground">
                {linkLoadFinished
                  ? "Ссылка недоступна для повторного копирования."
                  : "Загружаем созданную ссылку…"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={request.isLocked}
                onClick={() => {
                  if (!window.confirm("Отозвать персональную ссылку? Она перестанет действовать.")) return;
                  void request.run(async () => {
                    const result = await revokeInvitationAction(groupId, pendingLink.publicId);
                    if (result.status === "error") setError(result.formError);
                    else {
                      onOpenChange(false);
                      router.refresh();
                    }
                    return result;
                  });
                }}
              >
                <XCircle aria-hidden="true" />
                Отозвать ссылку
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={request.isLocked}
              onClick={() => void request.run(async () => {
                setError(undefined);
                const result = await createLinkInvitationAction(groupId, member.publicId);
                if (result.status === "error") setError(result.formError);
                else {
                  setInvitePath(result.invitePath);
                  router.refresh();
                }
                return result;
              })}
            >
              <Link2 aria-hidden="true" />
              Создать ссылку
            </Button>
          )}
        </section>
      </div>
    </Dialog>
  );
}

export function MemberInvitationControls({
  groupId,
  member,
}: {
  groupId: string;
  member: InvitationMemberView;
}) {
  const [open, setOpen] = useState(false);

  if (member.isConnected) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-primary">Аккаунт подключён</p>
        {member.connectedProfile ? (
          <>
            <p className="text-sm">{member.connectedProfile.firstName} {member.connectedProfile.lastName}</p>
            <p className="font-mono text-xs text-muted-foreground">{member.connectedProfile.rollcallId}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Профиль аккаунта недоступен</p>
        )}
      </div>
    );
  }

  if (member.pendingInvitations.length > 0) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Приглашение ожидает ответа</p>
          {member.pendingInvitations.map((invitation) => (
            <p key={invitation.publicId} className="mt-1 text-xs text-muted-foreground">
              {invitation.targetProfile
                ? `${invitation.targetProfile.firstName} ${invitation.targetProfile.lastName} · ${invitation.targetProfile.rollcallId}`
                : "Персональная ссылка"}
            </p>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Просмотреть
        </Button>
        <InviteDialog
          groupId={groupId}
          member={member}
          open={open}
          onOpenChange={setOpen}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Аккаунт не подключён</p>
      {member.isActive ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <UserPlus aria-hidden="true" />
          Пригласить
        </Button>
      ) : null}
      <InviteDialog
        groupId={groupId}
        member={member}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

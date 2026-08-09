"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { NativeSelect } from "@/components/ui/native-select";
import type { GroupMemberRole } from "@/features/members/domain/members";
import {
  formatMemberName,
  memberRoleLabels,
} from "@/features/members/presentation/member-copy";
import { cn } from "@/lib/utils";

type MemberOption = {
  publicId: string;
  firstName: string;
  lastName: string;
  role: GroupMemberRole;
  isActive: boolean;
};

export function DevelopmentViewSwitcher({
  groupId,
  members,
}: {
  groupId: string;
  members: MemberOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const studentRoute = pathname.match(
    /^\/groups\/[^/]+\/student\/([^/]+)\/(attendance|statistics)(?:\/|$)/,
  );
  const selectedMemberId = studentRoute?.[1];
  const selectedStudentSection = studentRoute?.[2] ?? "attendance";
  const [studentChoicePath, setStudentChoicePath] = useState<string>();
  const studentChoicePending = studentChoicePath === pathname;
  const studentMode = Boolean(studentRoute) || studentChoicePending;
  const selectedMember = members.find(
    ({ publicId }) => publicId === selectedMemberId,
  );

  return (
    <section
      aria-label="Временное переключение вида приложения"
      className="rounded-md border bg-card p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold">Режим разработки</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Временная имитация будущего входа в приложение.
          </p>
        </div>
        <div
          className={cn(
            "grid w-full gap-4 sm:w-auto",
            studentMode ? "sm:grid-cols-2 lg:w-[34rem]" : "sm:w-64",
          )}
        >
          <label className="block text-sm font-medium">
            Вид приложения
            <NativeSelect
              className="mt-2"
              value={studentMode ? "student" : "headman"}
              onChange={(event) => {
                if (event.target.value === "headman") {
                  setStudentChoicePath(undefined);
                  router.push(`/groups/${groupId}`);
                } else {
                  setStudentChoicePath(pathname);
                }
              }}
            >
              <option value="headman">Староста</option>
              <option value="student">Студент</option>
            </NativeSelect>
          </label>

          {studentMode ? (
            <label className="block text-sm font-medium">
              Участник группы
              <NativeSelect
                className="mt-2"
                value={selectedMember?.publicId ?? ""}
                disabled={members.length === 0}
                onChange={(event) => {
                  const memberId = event.target.value;
                  if (memberId) {
                    router.push(
                      `/groups/${groupId}/student/${memberId}/${selectedStudentSection}`,
                    );
                  }
                }}
              >
                <option value="">
                  {members.length > 0
                    ? "Выберите участника"
                    : "В группе нет участников"}
                </option>
                {members.map((member) => (
                  <option key={member.publicId} value={member.publicId}>
                    {formatMemberName(member)} · {memberRoleLabels[member.role]}
                    {member.isActive ? "" : " · неактивен"}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}

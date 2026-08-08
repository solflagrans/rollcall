"use client";

import {
  BookOpenCheck,
  BookOpenText,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function GroupSectionNav({
  groupId,
  placement = "mobile",
}: {
  groupId: string;
  placement?: "mobile" | "sidebar";
}) {
  const pathname = usePathname();
  const studentView = pathname.includes("/student/");
  const membersSelected = pathname.includes("/members");
  const disciplinesSelected = pathname.includes("/disciplines");

  const items = studentView
    ? [
        {
          href: pathname,
          label: "Моя посещаемость",
          selected: true,
          icon: ClipboardCheck,
        },
      ]
    : [
        {
          href: `/groups/${groupId}`,
          label: "Журнал",
          selected: !membersSelected && !disciplinesSelected,
          icon: BookOpenCheck,
        },
        {
          href: `/groups/${groupId}/disciplines`,
          label: "Дисциплины",
          selected: disciplinesSelected,
          icon: BookOpenText,
        },
        {
          href: `/groups/${groupId}/members`,
          label: "Состав",
          selected: membersSelected,
          icon: UsersRound,
        },
      ];

  if (placement === "sidebar") {
    return (
      <nav aria-label="Разделы группы" className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.selected ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                item.selected && "bg-accent text-accent-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Разделы группы" className="overflow-x-auto md:hidden">
      <div className="flex min-w-max gap-1 border-b">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.selected ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center px-3 text-sm font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              item.selected &&
                "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

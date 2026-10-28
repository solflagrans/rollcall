import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SurfaceLevel = "plain" | "subtle" | "raised";

export const surfaceClassNames: Record<SurfaceLevel, string> = {
  plain: "bg-transparent",
  subtle: "rounded-md bg-surface-subtle",
  raised: "rounded-md border bg-card shadow-xs",
};

export function Surface({
  as: Component = "div",
  level = "plain",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
  level?: SurfaceLevel;
}) {
  return (
    <Component
      data-surface={level}
      className={cn(surfaceClassNames[level], className)}
      {...props}
    />
  );
}

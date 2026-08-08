"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = ["system", "light", "dark"] as const;

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme = "system", setTheme } = useTheme();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const currentTheme = themes.includes(theme as (typeof themes)[number])
    ? (theme as (typeof themes)[number])
    : "system";
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  const label = `Тема: ${currentTheme}. Переключить на ${nextTheme}`;
  const Icon = mounted
    ? currentTheme === "light"
      ? Sun
      : currentTheme === "dark"
        ? Moon
        : Monitor
    : Monitor;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={mounted ? label : "Переключатель темы"}
          onClick={() => setTheme(nextTheme)}
        >
          <Icon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{mounted ? label : "Переключатель темы"}</TooltipContent>
    </Tooltip>
  );
}

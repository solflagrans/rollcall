"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <button className="icon-button" type="button" aria-label="Переключить тему" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
    {mounted && resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}

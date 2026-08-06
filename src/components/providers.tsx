"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ChunkRecovery } from "@/components/chunk-recovery";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <ChunkRecovery />{children}<Toaster richColors position="top-center" />
  </ThemeProvider>;
}

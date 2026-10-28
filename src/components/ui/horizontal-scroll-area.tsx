"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const edgeToneClasses = {
  page: "from-background",
  card: "from-card",
  subtle: "from-surface-subtle",
} as const;

function readEdges(viewport: HTMLDivElement) {
  const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
  return {
    left: viewport.scrollLeft > 2,
    right: viewport.scrollLeft < maxScrollLeft - 2,
  };
}

export function HorizontalScrollArea({
  children,
  className,
  viewportClassName,
  label,
  tabIndex,
  edgeTone = "page",
  viewportRef: providedViewportRef,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  label?: string;
  tabIndex?: number;
  edgeTone?: keyof typeof edgeToneClasses;
  viewportRef?: RefObject<HTMLDivElement | null>;
}) {
  const internalViewportRef = useRef<HTMLDivElement>(null);
  const viewportRef = providedViewportRef ?? internalViewportRef;
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateEdges = () => setEdges(readEdges(viewport));
    updateEdges();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    return () => observer.disconnect();
  }, [viewportRef]);

  const tone = edgeToneClasses[edgeTone];

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={viewportRef}
        className={cn("overflow-x-auto", viewportClassName)}
        aria-label={label}
        tabIndex={tabIndex}
        onScroll={(event) => setEdges(readEdges(event.currentTarget))}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-30 w-7 bg-linear-to-r to-transparent transition-opacity",
          tone,
          edges.left ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-30 w-7 bg-linear-to-l to-transparent transition-opacity",
          tone,
          edges.right ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

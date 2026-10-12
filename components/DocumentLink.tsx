"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import Link from "next/link";
import { useConvex, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type DocumentLinkProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & (
  | { kind: "note"; id: Id<"notes"> }
  | { kind: "canvas"; id: Id<"canvases"> }
);

export function DocumentLink({ kind, id, onMouseEnter, onMouseLeave, onFocus, onBlur, onTouchStart, ...props }: DocumentLinkProps) {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWarm = useRef(0);

  function cancelWarm() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function warm() {
    cancelWarm();
    setActive(true);
    if (!isAuthenticated || Date.now() - lastWarm.current < 4_000) return;
    lastWarm.current = Date.now();
    if (kind === "note") {
      convex.prewarmQuery({ query: api.notes.getNote, args: { id } });
      void import("@/components/NoteEditor").catch(() => {});
    } else {
      convex.prewarmQuery({ query: api.canvases.getCanvas, args: { id } });
      void import("@/components/CanvasEditor").catch(() => {});
    }
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Link
      {...props}
      href={kind === "note" ? `/notes/${id}` : `/canvas/${id}`}
      scroll={false}
      prefetch={active ? true : "auto"}
      onMouseEnter={(event) => { onMouseEnter?.(event); timer.current = setTimeout(warm, 100); }}
      onMouseLeave={(event) => { cancelWarm(); onMouseLeave?.(event); }}
      onFocus={(event) => { warm(); onFocus?.(event); }}
      onBlur={(event) => { cancelWarm(); onBlur?.(event); }}
      onTouchStart={(event) => { warm(); onTouchStart?.(event); }}
    />
  );
}

"use client";

import { useMemo } from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { getNoteSummaries } from "@/lib/notes-data";
import type { PreloadedNotes, PreloadedTrashCount } from "@/lib/notes-data";

const EMPTY: never[] = [];

export function useNoteSummaries(preloadedNotes: PreloadedNotes) {
  const notes = usePreloadedAuthQuery(preloadedNotes) ?? EMPTY;
  return useMemo(() => getNoteSummaries(notes), [notes]);
}

export function useTrashCount(preloadedTrashCount: PreloadedTrashCount) {
  const trash = usePreloadedAuthQuery(preloadedTrashCount);
  return typeof trash === "number" ? trash : trash?.length ?? 0;
}

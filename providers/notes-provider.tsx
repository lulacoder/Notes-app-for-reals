"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";

interface NotesData {
  preloadedNotes: Preloaded<typeof api.notes.listNoteSummaries>;
  preloadedCanvases: Preloaded<typeof api.canvases.listCanvases>;
  preloadedTags: Preloaded<typeof api.tags.listTags>;
}

const NotesContext = createContext<NotesData | null>(null);

export function NotesProvider({ children, ...data }: NotesData & { children: ReactNode }) {
  return <NotesContext value={data}>{children}</NotesContext>;
}

export function useNotesData() {
  const data = useContext(NotesContext);
  if (!data) throw new Error("NotesProvider is required");
  return data;
}

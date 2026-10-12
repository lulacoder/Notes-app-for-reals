"use client";

import dynamic from "next/dynamic";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import type { Doc } from "@/convex/_generated/dataModel";
import { useNotesData } from "@/providers/notes-provider";
import { useNotesViewMode } from "@/lib/use-notes-view-mode";
import { useNoteSummaries } from "@/lib/use-notes-queries";

const NoteEditor = dynamic(() => import("@/components/NoteEditor").then((module) => module.NoteEditor));
const NotesGrid = dynamic(() => import("@/components/NotesGrid").then((module) => module.NotesGrid));
const EMPTY: never[] = [];

interface NotesPageClientProps { initialNote: Doc<"notes"> | null; }

export function NotesPageClient({ initialNote }: NotesPageClientProps) {
  const { preloadedNotes, preloadedCanvases, preloadedTags } = useNotesData();
  const [viewMode] = useNotesViewMode();
  const notes = useNoteSummaries(preloadedNotes);
  const canvases = usePreloadedAuthQuery(preloadedCanvases) ?? EMPTY;
  const tags = usePreloadedAuthQuery(preloadedTags) ?? EMPTY;
  const selectedNoteId = notes[0]?._id ?? null;

  if (viewMode === "grid") {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-4 md:p-6 pb-24 md:pb-6">
        <NotesGrid notes={notes} canvases={canvases} tags={tags} selectedNoteId={selectedNoteId} />
      </div>
    );
  }

  return <NoteEditor key={selectedNoteId ?? "empty"} noteId={selectedNoteId} initialNote={initialNote?._id === selectedNoteId ? initialNote : undefined} />;
}

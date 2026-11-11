"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useNotesData } from "@/providers/notes-provider";
import { useNotesViewMode } from "@/lib/use-notes-view-mode";
import { useNoteSummaries } from "@/lib/use-notes-queries";
import { ContentSkeleton } from "@/components/DashboardSkeleton";
import { useToast } from "@/components/ui/toast-notification";

const NoteEditor = dynamic(() => import("@/components/NoteEditor").then((module) => module.NoteEditor));
const NotesGrid = dynamic(() => import("@/components/NotesGrid").then((module) => module.NotesGrid));
const EMPTY: never[] = [];

interface NotesPageClientProps { initialNote: Doc<"notes"> | null; }

export function NotesPageClient({ initialNote }: NotesPageClientProps) {
  const { preloadedNotes, preloadedTags } = useNotesData();
  const [viewMode] = useNotesViewMode();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const createNote = useMutation(api.notes.createNote);
  const { error } = useToast();
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const notes = useNoteSummaries(preloadedNotes);
  const canvases = useQuery(api.canvases.listCanvases, viewMode === "grid" && isAuthenticated ? {} : "skip");
  const tags = usePreloadedAuthQuery(preloadedTags) ?? EMPTY;
  const selectedNoteId = notes[0]?._id ?? null;

  async function handleCreateNote() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const id = await createNote({});
      router.push(`/notes/${id}`);
    } catch (cause) {
      console.error("Failed to create note:", cause);
      error("Could not create note", "Please try again.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  if (viewMode === "grid") {
    if (canvases === undefined) return <ContentSkeleton />;
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-4 md:p-6 pb-24 md:pb-6">
        <NotesGrid notes={notes} canvases={canvases} tags={tags} selectedNoteId={selectedNoteId} onCreateNote={() => void handleCreateNote()} creating={creating} />
      </div>
    );
  }

  return <NoteEditor key={selectedNoteId ?? "empty"} noteId={selectedNoteId} initialNote={initialNote?._id === selectedNoteId ? initialNote : undefined} />;
}

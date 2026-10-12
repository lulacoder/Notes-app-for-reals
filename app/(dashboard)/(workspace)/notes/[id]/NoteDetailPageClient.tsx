"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useRouter } from "next/navigation";
import type { Preloaded } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { NoteEditor } from "@/components/NoteEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

interface NoteDetailPageClientProps {
  noteId: Id<"notes">;
  preloadedSelectedNote: Preloaded<typeof api.notes.getNote>;
}

export function NoteDetailPageClient({ noteId, preloadedSelectedNote }: NoteDetailPageClientProps) {
  const router = useRouter();
  const selectedNote = usePreloadedAuthQuery(preloadedSelectedNote);

  if (selectedNote === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-medium">Note not found</h2>
        <Button variant="outline" onClick={() => router.push("/notes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Notes
        </Button>
      </div>
    );
  }

  return <NoteEditor key={noteId} noteId={noteId} initialNote={selectedNote} />;
}

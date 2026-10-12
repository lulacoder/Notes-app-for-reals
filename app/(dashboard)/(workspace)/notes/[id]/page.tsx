import type { Id } from "@/convex/_generated/dataModel";
import { preloadNote } from "@/lib/document-server";
import { NoteDetailPageClient } from "./NoteDetailPageClient";
import { ContentSkeleton } from "@/components/DashboardSkeleton";

export default function NoteDetailPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<ContentSkeleton />}><NoteContent {...props} /></Suspense>;
}

async function NoteContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noteId = id as Id<"notes">;

  const preloadedSelectedNote = await preloadNote(noteId);

  return (
    <NoteDetailPageClient
      noteId={noteId}
      preloadedSelectedNote={preloadedSelectedNote}
    />
  );
}
import { Suspense } from "react";

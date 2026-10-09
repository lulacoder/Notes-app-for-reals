import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { NoteDetailPageClient } from "./NoteDetailPageClient";
import { NotesSkeleton } from "@/components/DashboardSkeleton";

export default function NoteDetailPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<NotesSkeleton />}><NoteContent {...props} /></Suspense>;
}

async function NoteContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noteId = id as Id<"notes">;

  const preloadedSelectedNote = await preloadAuthQuery(api.notes.getNote, { id: noteId });

  return (
    <NoteDetailPageClient
      noteId={noteId}
      preloadedSelectedNote={preloadedSelectedNote}
    />
  );
}
import { Suspense } from "react";

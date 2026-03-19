import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { NoteDetailPageClient } from "./NoteDetailPageClient";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noteId = id as Id<"notes">;

  const [preloadedNotes, preloadedCanvases, preloadedTags, preloadedTrash, preloadedSelectedNote] =
    await Promise.all([
      preloadAuthQuery(api.notes.listNotes),
      preloadAuthQuery(api.canvases.listCanvases),
      preloadAuthQuery(api.tags.listTags),
      preloadAuthQuery(api.notes.listTrash),
      preloadAuthQuery(api.notes.getNote, { id: noteId }),
    ]);

  return (
    <NoteDetailPageClient
      noteId={noteId}
      preloadedNotes={preloadedNotes}
      preloadedCanvases={preloadedCanvases}
      preloadedTags={preloadedTags}
      preloadedTrash={preloadedTrash}
      preloadedSelectedNote={preloadedSelectedNote}
    />
  );
}

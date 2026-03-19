import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { NotesPageClient } from "./NotesPageClient";

export default async function NotesPage() {
  const [preloadedNotes, preloadedCanvases, preloadedTags, preloadedTrash] = await Promise.all([
    preloadAuthQuery(api.notes.listNotes),
    preloadAuthQuery(api.canvases.listCanvases),
    preloadAuthQuery(api.tags.listTags),
    preloadAuthQuery(api.notes.listTrash),
  ]);

  return (
    <NotesPageClient
      preloadedNotes={preloadedNotes}
      preloadedCanvases={preloadedCanvases}
      preloadedTags={preloadedTags}
      preloadedTrash={preloadedTrash}
    />
  );
}

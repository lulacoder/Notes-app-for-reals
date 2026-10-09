import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";

// Deduplicate layout/page reads within a request. Convex owns freshness across requests.
export const getNotesData = cache(async () => {
  const [preloadedNotes, preloadedCanvases, preloadedTags] = await Promise.all([
    preloadAuthQuery(api.notes.listNoteSummaries),
    preloadAuthQuery(api.canvases.listCanvases),
    preloadAuthQuery(api.tags.listTags),
  ]);
  return { preloadedNotes, preloadedCanvases, preloadedTags };
});

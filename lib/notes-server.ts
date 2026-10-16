import { cache } from "react";
import { getFunctionName } from "convex/server";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import type { PreloadedCanvases, PreloadedNotes, PreloadedTrashCount } from "@/lib/notes-data";

function isMissingFunction(error: unknown, name: string) {
  return error instanceof Error && error.message.includes(`Could not find public function for '${name}'.`);
}

async function preloadNotes(): Promise<PreloadedNotes> {
  try {
    return await preloadAuthQuery(api.notes.listNoteSummaries);
  } catch (error) {
    if (!isMissingFunction(error, getFunctionName(api.notes.listNoteSummaries))) throw error;
    // Keep the legacy query name so the browser subscribes to a deployed function.
    return preloadAuthQuery(api.notes.listNotes);
  }
}

async function preloadCanvases(): Promise<PreloadedCanvases> {
  try {
    return await preloadAuthQuery(api.canvases.listCanvasSummaries);
  } catch (error) {
    // Production Convex hides missing-function details behind this generic error.
    const opaqueServerError = error instanceof Error && /^\[Request ID: [^\]]+\] Server Error\s*$/.test(error.message);
    if (!isMissingFunction(error, getFunctionName(api.canvases.listCanvasSummaries)) && !opaqueServerError) throw error;
    console.warn("Canvas summaries unavailable; falling back to the full canvas query.", error);
    try {
      return await preloadAuthQuery(api.canvases.listCanvases);
    } catch {
      throw error;
    }
  }
}

async function preloadTrashCount(): Promise<PreloadedTrashCount> {
  try {
    return await preloadAuthQuery(api.notes.countTrash);
  } catch (error) {
    if (!isMissingFunction(error, getFunctionName(api.notes.countTrash))) throw error;
    return preloadAuthQuery(api.notes.listTrash);
  }
}

// Deduplicate layout/page reads within a request. Convex owns freshness across requests.
export const getNotesData = cache(async () => {
  const [preloadedNotes, preloadedCanvases, preloadedTags, preloadedTrashCount] = await Promise.all([
    preloadNotes(),
    preloadCanvases(),
    preloadAuthQuery(api.tags.listTags),
    preloadTrashCount(),
  ]);
  return { preloadedNotes, preloadedCanvases, preloadedTags, preloadedTrashCount };
});

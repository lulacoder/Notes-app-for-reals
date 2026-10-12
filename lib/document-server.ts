import { cacheLife } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { preloadAuthQuery } from "@/lib/auth-server";

// Keep prefetched results private to this browser session. The editor's Convex
// subscription takes over, including updates made after the prefetch.
export async function preloadNote(id: Id<"notes">) {
  "use cache: private";
  cacheLife({ stale: 30 });
  return preloadAuthQuery(api.notes.getNote, { id });
}

export async function preloadCanvas(id: Id<"canvases">) {
  "use cache: private";
  cacheLife({ stale: 30 });
  return preloadAuthQuery(api.canvases.getCanvas, { id });
}

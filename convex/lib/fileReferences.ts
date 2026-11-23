import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

interface ReferenceDocument {
  documentId: Id<"notes"> | Id<"canvases"> | Id<"noteVersions">;
  userId: string;
  noteId?: Id<"notes">;
  canvasId?: Id<"canvases">;
}

export async function removeFileReferences(ctx: MutationCtx, documentId: ReferenceDocument["documentId"]): Promise<void> {
  const references = await ctx.db.query("fileReferences")
    .withIndex("by_document", (q) => q.eq("documentId", documentId)).collect();
  for (const reference of references) await ctx.db.delete("fileReferences", reference._id);
}

export function fileReferenceKeys(content: string): Set<string> {
  const keys = new Set<string>();
  // Store opaque URL identifiers without assuming a Convex ID format.
  // Also retain raw storageId fields in legacy canvas JSON.
  const normalizedContent = content.replaceAll("\\/", "/");
  const candidates = [
    ...normalizedContent.matchAll(/\/api\/storage\/([^\s"'<>\\/?#()[\]{},]+)/g),
    ...normalizedContent.matchAll(/"storageId"\s*:\s*"([^"]+)"/g),
  ];
  for (const match of candidates) {
    let candidate = match[1];
    try { candidate = decodeURIComponent(candidate); } catch { /* Keep malformed URLs unindexed. */ }
    keys.add(candidate);
  }
  return keys;
}

export async function syncFileReferences(ctx: MutationCtx, document: ReferenceDocument, content: string): Promise<void> {
  const keys = fileReferenceKeys(content);
  const previous = await ctx.db.query("fileReferences")
    .withIndex("by_document", (q) => q.eq("documentId", document.documentId)).collect();
  for (const reference of previous) {
    if (keys.has(reference.fileKey)) keys.delete(reference.fileKey);
    else await ctx.db.delete("fileReferences", reference._id);
  }
  for (const fileKey of keys) await ctx.db.insert("fileReferences", { ...document, fileKey });
}

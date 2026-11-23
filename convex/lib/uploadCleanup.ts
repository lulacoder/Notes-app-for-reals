import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

interface DeletedDocuments {
  noteIds?: Id<"notes">[];
  canvasIds?: Id<"canvases">[];
}

// Call after deleting the documents and their versions, within the same mutation.
export async function cleanupDocumentUploads(
  ctx: MutationCtx,
  userId: string,
  { noteIds = [], canvasIds = [] }: DeletedDocuments,
) {
  const uploadGroups = await Promise.all([
    ...noteIds.map((id) => ctx.db.query("uploads").withIndex("by_note", (q) => q.eq("noteId", id)).collect()),
    ...canvasIds.map((id) => ctx.db.query("uploads").withIndex("by_canvas", (q) => q.eq("canvasId", id)).collect()),
  ]);
  const uploads = new Map(uploadGroups.flat().map((upload) => [upload._id, upload]));
  const storageIds = new Set<Id<"_storage">>();

  for (const upload of uploads.values()) {
    if (upload.userId !== userId) continue;
    const noteId = upload.noteId && !noteIds.includes(upload.noteId) ? upload.noteId : undefined;
    const canvasId = upload.canvasId && !canvasIds.includes(upload.canvasId) ? upload.canvasId : undefined;
    if (noteId || canvasId) {
      await ctx.db.patch("uploads", upload._id, { noteId, canvasId });
    } else {
      await ctx.db.delete("uploads", upload._id);
      storageIds.add(upload.storageId);
    }
  }

  // Keep cleaning up assets uploaded by the previous canvas implementation.
  for (const canvasId of canvasIds) {
    const assets = await ctx.db.query("canvasAssets").withIndex("by_canvas", (q) => q.eq("canvasId", canvasId)).collect();
    for (const asset of assets) {
      if (asset.userId !== userId) continue;
      await ctx.db.delete("canvasAssets", asset._id);
      storageIds.add(asset.storageId);
    }
  }
  if (storageIds.size === 0) return;

  // Inline URLs can also be copied into another note or retained in its history.
  // Include trashed documents because they can still be restored.
  const [notes, canvases, versions] = await Promise.all([
    ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ctx.db.query("canvases").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ctx.db.query("noteVersions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  ]);
  const contents = [
    ...notes.flatMap((note) => [note.content, note.thumbnail ?? ""]),
    ...canvases.map((canvas) => canvas.content),
    ...versions.map((version) => version.content),
  ];

  for (const storageId of storageIds) {
    const [upload, asset, url] = await Promise.all([
      ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first(),
      ctx.db.query("canvasAssets").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first(),
      ctx.storage.getUrl(storageId),
    ]);
    if (upload || asset || contents.some((content) => content.includes(storageId) || (url !== null && content.includes(url)))) continue;
    await ctx.storage.delete(storageId);
  }
}

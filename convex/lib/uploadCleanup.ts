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
  const legacyAssets = new Map<Id<"_storage">, { assetId: string; mimeType: string }>();

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
      legacyAssets.set(asset.storageId, asset);
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
  for (const storageId of storageIds) {
    const [upload, asset, url] = await Promise.all([
      ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first(),
      ctx.db.query("canvasAssets").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first(),
      ctx.storage.getUrl(storageId),
    ]);
    if (upload || asset) continue;
    const referencesFile = (content: string) => content.includes(storageId) || (url !== null && content.includes(url));
    const note = notes.find((item) => referencesFile(item.content) || referencesFile(item.thumbnail ?? ""));
    const version = note ? undefined : versions.find((item) => referencesFile(item.content));
    const canvas = canvases.find((item) => referencesFile(item.content));
    if (note || version || canvas) {
      // Transfer tracking to a surviving reference so deleting it later can also
      // reclaim the file. Merely keeping the blob would leave it untracked.
      const source = [...uploads.values()].find((item) => item.storageId === storageId && item.userId === userId);
      const legacy = legacyAssets.get(storageId);
      const metadata = await ctx.db.system.get("_storage", storageId);
      if (metadata && (source || legacy)) {
        await ctx.db.insert("uploads", {
          storageId, userId,
          noteId: note?._id ?? version?.noteId,
          canvasId: canvas?._id,
          filename: source?.filename ?? legacy?.assetId ?? "canvas-asset",
          mimeType: source?.mimeType ?? legacy?.mimeType ?? "application/octet-stream",
          size: metadata.size,
          createdAt: source?.createdAt ?? Date.now(),
        });
      }
      continue;
    }
    await ctx.storage.delete(storageId);
  }
}

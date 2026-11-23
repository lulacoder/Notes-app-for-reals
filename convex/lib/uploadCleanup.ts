import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

interface DeletedDocuments {
  noteIds?: Id<"notes">[];
  canvasIds?: Id<"canvases">[];
}

// Only reads attachment metadata for the deleted documents. File reclamation is
// deferred until the user's one-time reference backfill has completed.
export async function cleanupDocumentUploads(
  ctx: MutationCtx,
  userId: string,
  { noteIds = [], canvasIds = [] }: DeletedDocuments,
): Promise<void> {
  const uploadGroups = await Promise.all([
    ...noteIds.map((id) => ctx.db.query("uploads").withIndex("by_note", (q) => q.eq("noteId", id)).collect()),
    ...canvasIds.map((id) => ctx.db.query("uploads").withIndex("by_canvas", (q) => q.eq("canvasId", id)).collect()),
  ]);
  const uploads = new Map(uploadGroups.flat().map((upload) => [upload._id, upload]));
  const pending = new Set<Id<"uploads">>();

  for (const upload of uploads.values()) {
    if (upload.userId !== userId) continue;
    const noteId = upload.noteId && !noteIds.includes(upload.noteId) ? upload.noteId : undefined;
    const canvasId = upload.canvasId && !canvasIds.includes(upload.canvasId) ? upload.canvasId : undefined;
    await ctx.db.patch("uploads", upload._id, { noteId, canvasId });
    if (!noteId && !canvasId) pending.add(upload._id);
  }

  // Retain legacy blobs and their metadata until the same indexed safety check.
  for (const canvasId of canvasIds) {
    const assets = await ctx.db.query("canvasAssets").withIndex("by_canvas", (q) => q.eq("canvasId", canvasId)).collect();
    for (const asset of assets) {
      if (asset.userId !== userId) continue;
      const metadata = await ctx.db.system.get("_storage", asset.storageId);
      if (metadata) {
        pending.add(await ctx.db.insert("uploads", {
          storageId: asset.storageId, userId, filename: asset.assetId,
          mimeType: asset.mimeType, size: metadata.size, createdAt: asset.createdAt,
        }));
      }
      await ctx.db.delete("canvasAssets", asset._id);
    }
  }
  if (pending.size === 0) return;
  for (const uploadId of pending) await ctx.db.insert("pendingUploadCleanup", { userId, uploadId });

  const backfill = await ctx.db.query("uploadReferenceBackfills").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  if (!backfill) {
    await ctx.db.insert("uploadReferenceBackfills", { userId, phase: "notes", cursor: null });
    await ctx.scheduler.runAfter(0, internal.uploadCleanup.backfillReferences, { userId });
  } else if (backfill.phase === "done") {
    await ctx.scheduler.runAfter(0, internal.uploadCleanup.processPendingUploads, { userId });
  }
}

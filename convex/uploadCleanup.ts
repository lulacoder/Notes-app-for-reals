import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { fileReferenceKeys, syncFileReferences } from "./lib/fileReferences";

// A one-time migration for pre-existing content, never a scan per deleted file.
// Writes maintain the index in the same transaction while this is running.
export const backfillReferences = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<null> => {
    const state = await ctx.db.query("uploadReferenceBackfills").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!state || state.phase === "done") return null;
    const options = { cursor: state.cursor, numItems: 10, maximumRowsRead: 10, maximumBytesRead: 1024 * 1024 };
    let isDone: boolean;
    let continueCursor: string;
    let nextPhase: "canvases" | "noteVersions" | "done";
    if (state.phase === "notes") {
      const result = await ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", userId)).paginate(options);
      for (const note of result.page) {
        await syncFileReferences(ctx, { documentId: note._id, noteId: note._id, userId }, `${note.content}\n${note.thumbnail ?? ""}`);
      }
      ({ isDone, continueCursor } = result);
      nextPhase = "canvases";
    } else if (state.phase === "canvases") {
      const result = await ctx.db.query("canvases").withIndex("by_user", (q) => q.eq("userId", userId)).paginate(options);
      for (const canvas of result.page) {
        await syncFileReferences(ctx, { documentId: canvas._id, canvasId: canvas._id, userId }, canvas.content);
      }
      ({ isDone, continueCursor } = result);
      nextPhase = "noteVersions";
    } else {
      const result = await ctx.db.query("noteVersions").withIndex("by_user", (q) => q.eq("userId", userId)).paginate(options);
      for (const version of result.page) {
        await syncFileReferences(ctx, { documentId: version._id, noteId: version.noteId, userId }, version.content);
      }
      ({ isDone, continueCursor } = result);
      nextPhase = "done";
    }
    const phase = isDone ? nextPhase : state.phase;
    await ctx.db.patch("uploadReferenceBackfills", state._id, { phase, cursor: isDone ? null : continueCursor });
    await ctx.scheduler.runAfter(0, phase === "done" ? internal.uploadCleanup.processPendingUploads : internal.uploadCleanup.backfillReferences, { userId });
    return null;
  },
});

export const processPendingUploads = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<null> => {
    const state = await ctx.db.query("uploadReferenceBackfills").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (state?.phase !== "done") return null;
    const pending = await ctx.db.query("pendingUploadCleanup").withIndex("by_user", (q) => q.eq("userId", userId)).take(20);
    for (const task of pending) {
      const source = await ctx.db.get("uploads", task.uploadId);
      if (source && source.userId === userId && !source.noteId && !source.canvasId) {
        // All lookups are indexed metadata lookups; no document/history content
        // is read. Concurrent content saves update fileReferences atomically.
        const keys = new Set([source.storageId as string, ...fileReferenceKeys(await ctx.storage.getUrl(source.storageId) ?? "")]);
        const [references, uploads, asset] = await Promise.all([
          Promise.all([...keys].map((key) => ctx.db.query("fileReferences").withIndex("by_file", (q) => q.eq("fileKey", key)).first())),
          ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", source.storageId)).take(2),
          ctx.db.query("canvasAssets").withIndex("by_storage", (q) => q.eq("storageId", source.storageId)).first(),
        ]);
        const reference = references.find((item) => item !== null);
        if (reference) {
          // Keep tracking the file through a surviving document/history owner.
          if (reference.userId === userId) {
            await ctx.db.patch("uploads", source._id, { noteId: reference.noteId, canvasId: reference.canvasId });
          }
        } else {
          if (!asset && !uploads.some((upload) => upload._id !== source._id)) await ctx.storage.delete(source.storageId);
          await ctx.db.delete("uploads", source._id);
        }
      }
      await ctx.db.delete("pendingUploadCleanup", task._id);
    }
    if (pending.length === 20) await ctx.scheduler.runAfter(0, internal.uploadCleanup.processPendingUploads, { userId });
    return null;
  },
});

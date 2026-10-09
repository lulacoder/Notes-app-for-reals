import { getActiveIdentity } from "./lib/active-identity";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for client-side upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded file metadata
export const saveUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    noteId: v.optional(v.id("notes")),
    canvasId: v.optional(v.id("canvases")),
  },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.noteId) {
      const note = await ctx.db.get(args.noteId);
      if (!note || note.userId !== identity.subject) throw new Error("Note not found");
    }
    if (args.canvasId) {
      const canvas = await ctx.db.get(args.canvasId);
      if (!canvas || canvas.userId !== identity.subject) throw new Error("Canvas not found");
    }

    const uploadId = await ctx.db.insert("uploads", {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      noteId: args.noteId,
      canvasId: args.canvasId,
      userId: identity.subject,
      createdAt: Date.now(),
    });

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);

    return { uploadId, url };
  },
});

// Get URL for a storage ID
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) return null;
    const upload = await ctx.db.query("uploads")
      .withIndex("by_user_storage", (q) => q.eq("userId", identity.subject).eq("storageId", args.storageId)).first();
    const asset = await ctx.db.query("canvasAssets")
      .withIndex("by_user_storage", (q) => q.eq("userId", identity.subject).eq("storageId", args.storageId)).first();
    if (!upload && !asset) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

// List uploads for a note
export const listNoteUploads = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) return [];
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.subject) return [];

    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();

    // Get URLs for each upload
    const uploadsWithUrls = await Promise.all(
      uploads.map(async (upload) => ({
        ...upload,
        url: await ctx.storage.getUrl(upload.storageId),
      }))
    );

    return uploadsWithUrls.filter((upload) => upload.userId === identity.subject);
  },
});

// Delete an upload
export const deleteUpload = mutation({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const upload = await ctx.db.get(args.uploadId);
    if (!upload || upload.userId !== identity.subject) {
      throw new Error("Upload not found");
    }

    // Delete from storage
    await ctx.storage.delete(upload.storageId);
    
    // Delete metadata
    await ctx.db.delete(args.uploadId);
  },
});

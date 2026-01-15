import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for client-side upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
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
    return await ctx.storage.getUrl(args.storageId);
  },
});

// List uploads for a note
export const listNoteUploads = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

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

    return uploadsWithUrls;
  },
});

// Delete an upload
export const deleteUpload = mutation({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
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

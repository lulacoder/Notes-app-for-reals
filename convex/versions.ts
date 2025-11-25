import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listVersions = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify note ownership
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("noteVersions")
      .withIndex("by_note_created", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .collect();
  },
});

export const getVersion = query({
  args: { id: v.id("noteVersions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const version = await ctx.db.get(args.id);
    if (!version || version.userId !== identity.subject) {
      return null;
    }

    return version;
  },
});

export const createVersion = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    const versionId = await ctx.db.insert("noteVersions", {
      noteId: args.noteId,
      title: args.title,
      content: args.content,
      userId: identity.subject,
      createdAt: Date.now(),
    });

    // Auto-cleanup: keep only last 50 versions
    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note_created", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .collect();

    const toDelete = versions.slice(50);
    for (const version of toDelete) {
      await ctx.db.delete(version._id);
    }

    return versionId;
  },
});

export const restoreVersion = mutation({
  args: { versionId: v.id("noteVersions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== identity.subject) {
      throw new Error("Version not found or unauthorized");
    }

    const note = await ctx.db.get(version.noteId);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    // Save current state as a version before restoring
    await ctx.db.insert("noteVersions", {
      noteId: version.noteId,
      title: note.title,
      content: note.content,
      userId: identity.subject,
      createdAt: Date.now(),
    });

    // Restore the version
    await ctx.db.patch(version.noteId, {
      title: version.title,
      content: version.content,
      updatedAt: Date.now(),
    });

    return version.noteId;
  },
});

export const deleteVersion = mutation({
  args: { id: v.id("noteVersions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const version = await ctx.db.get(args.id);
    if (!version || version.userId !== identity.subject) {
      throw new Error("Version not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Clean up old versions (keep last 50 per note)
export const cleanupVersions = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note_created", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .collect();

    // Keep only last 50 versions
    const toDelete = versions.slice(50);
    for (const version of toDelete) {
      await ctx.db.delete(version._id);
    }

    return toDelete.length;
  },
});

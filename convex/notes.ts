import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List active notes (not deleted)
export const listNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Filter out deleted notes and sort: pinned first, then by updatedAt
    return notes
      .filter((note) => !note.isDeleted)
      .sort((a, b) => {
        // Pinned notes first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by updatedAt
        return b.updatedAt - a.updatedAt;
      });
  },
});

// List deleted notes (trash)
export const listTrash = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return notes
      .filter((note) => note.isDeleted)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },
});

export const getNote = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      return null;
    }

    return note;
  },
});

export const createNote = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      title: args.title || "Untitled",
      content: args.content || "",
      userId: identity.subject,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      isPinned: false,
      tagIds: [],
    });

    return noteId;
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    saveVersion: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    // Save version if requested and content changed
    if (args.saveVersion && (args.title !== note.title || args.content !== note.content)) {
      await ctx.db.insert("noteVersions", {
        noteId: args.id,
        title: note.title,
        content: note.content,
        userId: identity.subject,
        createdAt: Date.now(),
      });
    }

    const updates: { title?: string; content?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.content !== undefined) {
      updates.content = args.content;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Soft delete (move to trash)
export const softDeleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      isPinned: false,
    });

    return args.id;
  },
});

// Restore from trash
export const restoreNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
    });

    return args.id;
  },
});

// Permanent delete
export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    // Delete all versions
    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Empty trash (delete all trashed notes older than 30 days or all)
export const emptyTrash = mutation({
  args: { all: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const toDelete = notes.filter(
      (note) =>
        note.isDeleted &&
        (args.all || (note.deletedAt && note.deletedAt < thirtyDaysAgo))
    );

    for (const note of toDelete) {
      // Delete versions first
      const versions = await ctx.db
        .query("noteVersions")
        .withIndex("by_note", (q) => q.eq("noteId", note._id))
        .collect();

      for (const version of versions) {
        await ctx.db.delete(version._id);
      }

      await ctx.db.delete(note._id);
    }

    return toDelete.length;
  },
});

// Toggle pin
export const togglePin = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      isPinned: !note.isPinned,
      pinnedAt: !note.isPinned ? Date.now() : undefined,
    });

    return args.id;
  },
});

// Update note tags
export const updateNoteTags = mutation({
  args: {
    id: v.id("notes"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      tagIds: args.tagIds,
    });

    return args.id;
  },
});

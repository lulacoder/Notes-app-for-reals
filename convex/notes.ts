import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      .order("desc")
      .collect();

    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
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
    });

    return noteId;
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
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

    await ctx.db.delete(args.id);
    return args.id;
  },
});

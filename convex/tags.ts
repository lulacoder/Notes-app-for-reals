import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if tag with same name exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", identity.subject).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error("Tag with this name already exists");
    }

    return await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const updateTag = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    const updates: { name?: string; color?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    // Remove tag from all notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const note of notes) {
      if (note.tagIds?.includes(args.id)) {
        await ctx.db.patch(note._id, {
          tagIds: note.tagIds.filter((id) => id !== args.id),
        });
      }
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

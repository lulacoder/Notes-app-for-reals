import { getActiveIdentity } from "./lib/activeIdentity";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getActiveIdentity(ctx);
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
    const identity = await getActiveIdentity(ctx);
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
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get("tags", args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    const updates: { name?: string; color?: string } = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Tag name cannot be empty");
      const existing = await ctx.db.query("tags")
        .withIndex("by_user_name", (q) => q.eq("userId", identity.subject).eq("name", name))
        .first();
      if (existing && existing._id !== args.id) throw new Error("Tag with this name already exists");
      updates.name = name;
    }
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch("tags", args.id, updates);
    return args.id;
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get("tags", args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    const [notes, canvases, cards] = await Promise.all([
      ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", identity.subject)).collect(),
      ctx.db.query("canvases").withIndex("by_user", (q) => q.eq("userId", identity.subject)).collect(),
      ctx.db.query("kanbanCards").withIndex("by_user_deleted", (q) => q.eq("userId", identity.subject)).collect(),
    ]);

    for (const note of notes) {
      if (note.tagIds?.includes(args.id)) {
        await ctx.db.patch("notes", note._id, {
          tagIds: note.tagIds.filter((id) => id !== args.id),
        });
      }
    }

    for (const canvas of canvases) {
      if (canvas.tagIds?.includes(args.id)) {
        await ctx.db.patch("canvases", canvas._id, { tagIds: canvas.tagIds.filter((id) => id !== args.id) });
      }
    }
    for (const card of cards) {
      if (card.tagIds?.includes(args.id)) {
        await ctx.db.patch("kanbanCards", card._id, { tagIds: card.tagIds.filter((id) => id !== args.id) });
      }
    }

    await ctx.db.delete("tags", args.id);
    return args.id;
  },
});

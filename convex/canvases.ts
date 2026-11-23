import { getActiveIdentity } from "./lib/activeIdentity";
import { cleanupDocumentUploads } from "./lib/uploadCleanup";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sidebar navigation does not need the shapes used by grid previews.
export const listCanvasSummaries = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) return [];

    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return canvases
      .filter((canvas) => !canvas.isDeleted)
      .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned) || b.updatedAt - a.updatedAt)
      .map((canvas) => ({
        _id: canvas._id, title: canvas.title, updatedAt: canvas.updatedAt,
        isPinned: canvas.isPinned, tagIds: canvas.tagIds,
      }));
  },
});

// List active canvases (not deleted)
export const listCanvases = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      return [];
    }

    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Filter out deleted and sort: pinned first, then by updatedAt
    return canvases
      .filter((canvas) => !canvas.isDeleted)
      .sort((a, b) => {
        // Pinned canvases first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by updatedAt
        return b.updatedAt - a.updatedAt;
      });
  },
});

// List deleted canvases (trash)
export const listTrash = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      return [];
    }

    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return canvases
      .filter((canvas) => canvas.isDeleted)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },
});

export const getCanvas = query({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      return null;
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      return null;
    }

    return canvas;
  },
});

export const createCanvas = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const canvasId = await ctx.db.insert("canvases", {
      title: args.title?.trim() || "Untitled Canvas",
      content: '{"shapes":[]}', // Empty canvas with shapes array
      userId: identity.subject,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      isPinned: false,
      tagIds: [],
    });

    return canvasId;
  },
});

export const updateCanvas = mutation({
  args: {
    id: v.id("canvases"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    const titleChanged = args.title !== undefined && args.title !== canvas.title;
    const contentChanged = args.content !== undefined && args.content !== canvas.content;
    if (!titleChanged && !contentChanged) return args.id;

    const updates: { title?: string; content?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (titleChanged) {
      updates.title = args.title;
    }
    if (contentChanged) {
      updates.content = args.content;
    }

    await ctx.db.patch("canvases", args.id, updates);
    return args.id;
  },
});

// Soft delete (move to trash)
export const softDeleteCanvas = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch("canvases", args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      isPinned: false,
    });

    return args.id;
  },
});

// Restore from trash
export const restoreCanvas = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch("canvases", args.id, {
      isDeleted: false,
      deletedAt: undefined,
    });

    return args.id;
  },
});

// Permanent delete
export const deleteCanvas = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    if (!canvas.isDeleted) throw new Error("Move the canvas to recently deleted first");

    await ctx.db.delete("canvases", args.id);
    await cleanupDocumentUploads(ctx, identity.subject, { canvasIds: [args.id] });
    return args.id;
  },
});

// Toggle pin
export const togglePin = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch("canvases", args.id, {
      isPinned: !canvas.isPinned,
      pinnedAt: !canvas.isPinned ? Date.now() : undefined,
    });

    return args.id;
  },
});

// Update canvas tags
export const updateCanvasTags = mutation({
  args: {
    id: v.id("canvases"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get("canvases", args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch("canvases", args.id, {
      tagIds: args.tagIds,
    });

    return args.id;
  },
});

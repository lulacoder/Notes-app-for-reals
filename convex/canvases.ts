import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List active canvases (not deleted)
export const listCanvases = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
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
    const identity = await ctx.auth.getUserIdentity();
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const canvas = await ctx.db.get(args.id);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const canvasId = await ctx.db.insert("canvases", {
      title: args.title || "Untitled Canvas",
      content: "{}", // Empty tldraw store
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
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
export const softDeleteCanvas = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
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
export const restoreCanvas = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    // Delete all associated assets
    const assets = await ctx.db
      .query("canvasAssets")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.id))
      .collect();

    for (const asset of assets) {
      await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Toggle pin
export const togglePin = mutation({
  args: { id: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.id);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      tagIds: args.tagIds,
    });

    return args.id;
  },
});

// Generate upload URL for images
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

// Save asset reference after upload
export const saveAsset = mutation({
  args: {
    canvasId: v.id("canvases"),
    assetId: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas || canvas.userId !== identity.subject) {
      throw new Error("Canvas not found or unauthorized");
    }

    const assetDocId = await ctx.db.insert("canvasAssets", {
      canvasId: args.canvasId,
      assetId: args.assetId,
      storageId: args.storageId,
      userId: identity.subject,
      mimeType: args.mimeType,
      createdAt: Date.now(),
    });

    return assetDocId;
  },
});

// Get asset URL by tldraw asset ID
export const getAssetUrl = query({
  args: { assetId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const asset = await ctx.db
      .query("canvasAssets")
      .withIndex("by_asset_id", (q) => q.eq("assetId", args.assetId))
      .first();

    if (!asset || asset.userId !== identity.subject) {
      return null;
    }

    return await ctx.storage.getUrl(asset.storageId);
  },
});

// Get all assets for a canvas
export const getCanvasAssets = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas || canvas.userId !== identity.subject) {
      return [];
    }

    const assets = await ctx.db
      .query("canvasAssets")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .collect();

    // Get URLs for all assets
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      }))
    );

    return assetsWithUrls;
  },
});

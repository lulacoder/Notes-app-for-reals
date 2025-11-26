import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    // Pin/favorite
    isPinned: v.optional(v.boolean()),
    pinnedAt: v.optional(v.number()),
    // Tags
    tagIds: v.optional(v.array(v.id("tags"))),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_deleted", ["userId", "isDeleted"])
    .index("by_user_pinned", ["userId", "isPinned"]),

  tags: defineTable({
    name: v.string(),
    color: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  noteVersions: defineTable({
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_note_created", ["noteId", "createdAt"]),

  // Infinite Canvas tables
  canvases: defineTable({
    title: v.string(),
    content: v.string(), // tldraw store JSON snapshot
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    // Pin/favorite
    isPinned: v.optional(v.boolean()),
    pinnedAt: v.optional(v.number()),
    // Tags (reuse existing tag system)
    tagIds: v.optional(v.array(v.id("tags"))),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_deleted", ["userId", "isDeleted"])
    .index("by_user_pinned", ["userId", "isPinned"]),

  canvasAssets: defineTable({
    canvasId: v.id("canvases"),
    assetId: v.string(), // tldraw asset ID
    storageId: v.id("_storage"),
    userId: v.string(),
    mimeType: v.string(),
    createdAt: v.number(),
  })
    .index("by_canvas", ["canvasId"])
    .index("by_asset_id", ["assetId"]),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    title: v.string(),
    content: v.string(), // Stores HTML from Tiptap editor
    contentFormat: v.optional(v.string()), // "html" | "markdown" (legacy)
    thumbnail: v.optional(v.string()), // First image URL for grid view preview
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

  // File uploads for notes and canvases
  uploads: defineTable({
    noteId: v.optional(v.id("notes")),
    canvasId: v.optional(v.id("canvases")),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_canvas", ["canvasId"])
    .index("by_user", ["userId"]),

  // Infinite Canvas tables
  canvases: defineTable({
    title: v.string(),
    content: v.string(), // Canvas shapes JSON
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

import { getActiveIdentity } from "./lib/activeIdentity";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { trimNoteVersions } from "./lib/versionRetention";
import { syncFileReferences } from "./lib/fileReferences";

export const listVersions = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      return [];
    }

    // Verify note ownership
    const note = await ctx.db.get("notes", args.noteId);
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
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      return null;
    }

    const version = await ctx.db.get("noteVersions", args.id);
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
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get("notes", args.noteId);
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

    await syncFileReferences(ctx, { documentId: versionId, noteId: args.noteId, userId: identity.subject }, args.content);
    await trimNoteVersions(ctx, args.noteId);

    return versionId;
  },
});

export const restoreVersion = mutation({
  args: {
    noteId: v.id("notes"),
    versionId: v.id("noteVersions"),
    expected: v.object({ title: v.string(), content: v.string() }),
  },
  handler: async (ctx, args) => {
    const identity = await getActiveIdentity(ctx);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const version = await ctx.db.get("noteVersions", args.versionId);
    if (!version || version.userId !== identity.subject || version.noteId !== args.noteId) {
      throw new Error("Version not found or unauthorized");
    }

    const note = await ctx.db.get("notes", version.noteId);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Note not found or unauthorized");
    }

    if (note.isDeleted) throw new Error("Restore the note from trash first");
    if (args.expected.title !== note.title || args.expected.content !== note.content) {
      throw new ConvexError("NOTE_EDIT_CONFLICT");
    }
    if (note.title === version.title && note.content === version.content) {
      return { title: version.title, content: version.content };
    }

    // Save current state as a version before restoring
    const snapshotId = await ctx.db.insert("noteVersions", {
      noteId: version.noteId,
      title: note.title,
      content: note.content,
      userId: identity.subject,
      createdAt: Date.now(),
    });
    await syncFileReferences(ctx, { documentId: snapshotId, noteId: version.noteId, userId: identity.subject }, note.content);

    // Restore the version
    await ctx.db.patch("notes", version.noteId, {
      title: version.title,
      content: version.content,
      updatedAt: Date.now(),
    });
    await syncFileReferences(ctx, { documentId: version.noteId, noteId: version.noteId, userId: identity.subject }, `${version.content}\n${note.thumbnail ?? ""}`);

    await trimNoteVersions(ctx, version.noteId);
    return { title: version.title, content: version.content };
  },
});

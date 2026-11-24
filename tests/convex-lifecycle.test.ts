import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

describe("tag editing", () => {
  it("renames and recolors owned tags while rejecting empty, duplicate, and unauthorized names", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const id = await owner.mutation(api.tags.createTag, { name: "Ideas", color: "bg-blue-500" });
    await owner.mutation(api.tags.createTag, { name: "Work", color: "bg-red-500" });
    await owner.mutation(api.tags.updateTag, { id, name: " Projects ", color: "bg-green-500" });
    expect(await owner.query(api.tags.listTags)).toContainEqual(expect.objectContaining({ _id: id, name: "Projects", color: "bg-green-500" }));
    await expect(owner.mutation(api.tags.updateTag, { id, name: "  " })).rejects.toThrow("empty");
    await expect(owner.mutation(api.tags.updateTag, { id, name: "Work" })).rejects.toThrow("already exists");
    await expect(other.mutation(api.tags.updateTag, { id, name: "Stolen" })).rejects.toThrow("unauthorized");
    await expect(t.mutation(api.tags.updateTag, { id, name: "Stolen" })).rejects.toThrow("Not authenticated");
  });

  it("deletes owned tags and clears references from notes, canvases and cards, including trash", async () => {
    const t = setup();
    const { client: owner, user } = await account(t, "user");
    const other = (await account(t, "user")).client;
    const id = await owner.mutation(api.tags.createTag, { name: "Ideas", color: "blue" });
    const keep = await owner.mutation(api.tags.createTag, { name: "Keep", color: "red" });
    const records = await t.run(async (ctx) => {
      const common = { userId: user._id, createdAt: 1, updatedAt: 1 };
      const note = await ctx.db.insert("notes", { ...common, title: "Note", content: "", tagIds: [id, keep] });
      const canvas = await ctx.db.insert("canvases", { ...common, title: "Canvas", content: "", tagIds: [id], isDeleted: true });
      const boardId = await ctx.db.insert("kanbanBoards", { ...common, title: "Board" });
      const columnId = await ctx.db.insert("kanbanColumns", { boardId, userId: user._id, createdAt: 1, title: "Column", order: 0 });
      const card = await ctx.db.insert("kanbanCards", { ...common, boardId, columnId, title: "Card", order: 0, tagIds: [id], isDeleted: true });
      return { note, canvas, card };
    });
    await expect(other.mutation(api.tags.deleteTag, { id })).rejects.toThrow("unauthorized");
    await owner.mutation(api.tags.deleteTag, { id });
    await t.run(async (ctx) => {
      expect(await ctx.db.get("tags", id)).toBeNull();
      expect((await ctx.db.get("notes", records.note))?.tagIds).toEqual([keep]);
      expect((await ctx.db.get("canvases", records.canvas))?.tagIds).toEqual([]);
      expect((await ctx.db.get("kanbanCards", records.card))?.tagIds).toEqual([]);
    });
  });
});

describe("version restoration", () => {
  it("snapshots the current note, restores the selected version, and rejects stale and mismatched requests", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const expected = { title: "Today", content: "<p>Current draft</p>" };
    const noteId = await owner.mutation(api.notes.createNote, expected);
    const versionId = await owner.mutation(api.versions.createVersion, { noteId, title: "Yesterday", content: "<p>Earlier</p>" });
    const args = { noteId, versionId, expected };
    await expect(other.mutation(api.versions.restoreVersion, args)).rejects.toThrow("unauthorized");
    await expect(t.mutation(api.versions.restoreVersion, args)).rejects.toThrow("Not authenticated");
    const differentNote = await owner.mutation(api.notes.createNote, {});
    await expect(owner.mutation(api.versions.restoreVersion, { ...args, noteId: differentNote })).rejects.toThrow("unauthorized");
    await expect(owner.mutation(api.versions.restoreVersion, { ...args, expected: { ...expected, content: "Stale" } }))
      .rejects.toMatchObject({ data: JSON.stringify("NOTE_EDIT_CONFLICT") });
    expect(await owner.query(api.versions.listVersions, { noteId })).toHaveLength(1);
    expect(await owner.mutation(api.versions.restoreVersion, args)).toEqual({ title: "Yesterday", content: "<p>Earlier</p>" });
    expect(await owner.query(api.notes.getNote, { id: noteId })).toMatchObject({ title: "Yesterday", content: "<p>Earlier</p>" });
    expect(await owner.query(api.versions.listVersions, { noteId })).toContainEqual(expect.objectContaining(expected));
    await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    await expect(owner.mutation(api.versions.restoreVersion, { ...args, expected: { title: "Yesterday", content: "<p>Earlier</p>" } })).rejects.toThrow("trash");
  });

  it("keeps at most 50 versions across creation, update snapshots, and restoration", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, { title: "Current", content: "Current" });
    for (let index = 0; index < 52; index++) {
      await owner.mutation(api.versions.createVersion, { noteId, title: `Version ${index}`, content: String(index) });
    }
    expect(await owner.query(api.versions.listVersions, { noteId })).toHaveLength(50);
    await owner.mutation(api.notes.updateNote, { id: noteId, title: "Edited", saveVersion: true });
    const versions = await owner.query(api.versions.listVersions, { noteId });
    expect(versions).toHaveLength(50);
    await owner.mutation(api.versions.restoreVersion, {
      noteId, versionId: versions[10]._id, expected: { title: "Edited", content: "Current" },
    });
    expect(await owner.query(api.versions.listVersions, { noteId })).toHaveLength(50);
  });
});

describe("permanent deletion", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it("keeps uploads during soft deletion and removes note uploads and history on permanent deletion", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["image"])));
    const { uploadId } = await owner.mutation(api.uploads.saveUpload, { noteId, storageId, filename: "image.png", mimeType: "image/png", size: 5 });
    await owner.mutation(api.versions.createVersion, { noteId, title: "Old", content: "Old" });
    await expect(other.mutation(api.notes.deleteNote, { id: noteId })).rejects.toThrow("unauthorized");
    await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();
    await owner.mutation(api.notes.deleteNote, { id: noteId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await owner.query(api.notes.getNote, { id: noteId })).toBeNull();
    expect(await t.run((ctx) => ctx.db.get("uploads", uploadId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("noteVersions").collect())).toEqual([]);
  });

  it.each(["note", "version", "canvas", "upload"] as const)("preserves files still referenced by another %s", async (reference) => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const deletedId = await owner.mutation(api.notes.createNote, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["shared"])));
    const metadata = { storageId, filename: "shared.png", mimeType: "image/png", size: 6 };
    const { url } = await owner.mutation(api.uploads.saveUpload, { ...metadata, noteId: deletedId });
    const content = `<img src="${url}">`;
    const noteId = await owner.mutation(api.notes.createNote, { content: reference === "note" ? content : "" });
    if (reference === "note") await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    if (reference === "version") await owner.mutation(api.versions.createVersion, { noteId, title: "Earlier", content });
    if (reference === "canvas") {
      const id = await owner.mutation(api.canvases.createCanvas, {});
      await owner.mutation(api.canvases.updateCanvas, { id, content });
    }
    if (reference === "upload") await owner.mutation(api.uploads.saveUpload, { ...metadata, noteId });
    await owner.mutation(api.notes.softDeleteNote, { id: deletedId });
    await owner.mutation(api.notes.deleteNote, { id: deletedId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();
  });

  it("cleans uploads when emptying trash", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["image"])));
    await owner.mutation(api.uploads.saveUpload, { noteId, storageId, filename: "image.png", mimeType: "image/png", size: 5 });
    await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    await owner.mutation(api.notes.emptyTrash, { all: true });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
  });

  it("transfers upload tracking to a copied-image note and cleans the file when its final reference is deleted", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const originalId = await owner.mutation(api.notes.createNote, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["copied"])));
    const { url } = await owner.mutation(api.uploads.saveUpload, { noteId: originalId, storageId, filename: "image.png", mimeType: "image/png", size: 6 });
    const copyId = await owner.mutation(api.notes.createNote, { content: `<img src="${url}">` });
    await owner.mutation(api.notes.softDeleteNote, { id: originalId });
    await owner.mutation(api.notes.deleteNote, { id: originalId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await owner.query(api.uploads.listNoteUploads, { noteId: copyId })).toHaveLength(1);
    await owner.mutation(api.notes.softDeleteNote, { id: copyId });
    await owner.mutation(api.notes.deleteNote, { id: copyId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
  });

  it("keeps an upload linked to a surviving canvas until both parent documents are deleted", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, {});
    const canvasId = await owner.mutation(api.canvases.createCanvas, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["shared"])));
    await owner.mutation(api.uploads.saveUpload, { noteId, canvasId, storageId, filename: "image.png", mimeType: "image/png", size: 6 });
    await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    await owner.mutation(api.notes.deleteNote, { id: noteId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();
    await owner.mutation(api.canvases.softDeleteCanvas, { id: canvasId });
    await owner.mutation(api.canvases.deleteCanvas, { id: canvasId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
  });

  it("deletes canvas uploads and legacy assets only after the canvas is trashed", async () => {
    const t = setup();
    const { client: owner, user } = await account(t, "user");
    const other = (await account(t, "user")).client;
    const id = await owner.mutation(api.canvases.createCanvas, {});
    const [storageId, legacyStorageId] = await t.run(async (ctx) => Promise.all([
      ctx.storage.store(new Blob(["new"])), ctx.storage.store(new Blob(["legacy"])),
    ]));
    await owner.mutation(api.uploads.saveUpload, { canvasId: id, storageId, filename: "new.png", mimeType: "image/png", size: 3 });
    await t.run((ctx) => ctx.db.insert("canvasAssets", { canvasId: id, storageId: legacyStorageId, assetId: "old-asset", mimeType: "image/png", userId: user._id, createdAt: 1 }));
    await expect(owner.mutation(api.canvases.deleteCanvas, { id })).rejects.toThrow("recently deleted");
    await expect(other.mutation(api.canvases.deleteCanvas, { id })).rejects.toThrow("unauthorized");
    await owner.mutation(api.canvases.softDeleteCanvas, { id });
    await owner.mutation(api.canvases.deleteCanvas, { id });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await owner.query(api.canvases.getCanvas, { id })).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("canvasAssets").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.system.get("_storage", legacyStorageId))).toBeNull();
  });

  it("deletes a trashed board and its columns/cards without affecting another board", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const id = await owner.mutation(api.kanban.createBoard, {});
    const keptId = await owner.mutation(api.kanban.createBoard, {});
    const [column] = await owner.query(api.kanban.listColumns, { boardId: id });
    const cardId = await owner.mutation(api.kanban.createCard, { boardId: id, columnId: column._id, title: "Task" });
    await expect(owner.mutation(api.kanban.permanentDeleteBoard, { id })).rejects.toThrow("recently deleted");
    await expect(other.mutation(api.kanban.permanentDeleteBoard, { id })).rejects.toThrow("unauthorized");
    await owner.mutation(api.kanban.softDeleteBoard, { id });
    await owner.mutation(api.kanban.permanentDeleteBoard, { id });
    expect(await owner.query(api.kanban.getBoard, { id })).toBeNull();
    expect(await t.run((ctx) => ctx.db.get("kanbanCards", cardId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get("kanbanColumns", column._id))).toBeNull();
    expect(await owner.query(api.kanban.getBoard, { id: keptId })).not.toBeNull();
  });
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it("backfills legacy content once in bounded pages and never repeats that scan for subsequent file deletion", async () => {
  const t = setup();
  const { client: owner, user } = await account(t, "user");
  const deletedId = await owner.mutation(api.notes.createNote, {});
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["legacy image"])));
  const { url } = await owner.mutation(api.uploads.saveUpload, { noteId: deletedId, storageId, filename: "legacy.png", mimeType: "image/png", size: 12 });
  const image = `<img src="${url}">`;
  // Simulate pre-index content exceeding the 16 MiB transaction read budget.
  const { notes, lastVersionId } = await t.run(async (ctx) => {
    const notes = [];
    for (let index = 0; index < 24; index++) {
      notes.push(await ctx.db.insert("notes", { userId: user._id, title: `Legacy ${index}`, content: "x".repeat(300_000), createdAt: index, updatedAt: index }));
    }
    let lastVersionId;
    for (let index = 0; index < 60; index++) {
      lastVersionId = await ctx.db.insert("noteVersions", { userId: user._id, noteId: notes[index % notes.length], title: "Legacy history", content: index === 59 ? image : "x".repeat(300_000), createdAt: index });
    }
    return { notes, lastVersionId };
  });
  await owner.mutation(api.notes.softDeleteNote, { id: deletedId });
  await owner.mutation(api.notes.deleteNote, { id: deletedId });
  expect(await owner.query(api.notes.getNote, { id: deletedId })).toBeNull();
  expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();

  vi.runOnlyPendingTimers();
  await t.finishInProgressScheduledFunctions();
  const progress = await t.run((ctx) => ctx.db.query("uploadReferenceBackfills").first());
  expect(progress).toMatchObject({ phase: "notes" });
  expect(progress?.cursor).not.toBeNull();
  expect(await t.run((ctx) => ctx.db.query("fileReferences").collect())).toEqual([]);
  // Saving a previously visited document must update the index immediately.
  await owner.mutation(api.notes.updateNote, { id: notes[0], content: image });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.query("uploadReferenceBackfills").first())).toMatchObject({ phase: "done" });
  expect(await t.run((ctx) => ctx.db.query("fileReferences").withIndex("by_document", (q) => q.eq("documentId", notes[0])).collect())).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.query("fileReferences").withIndex("by_document", (q) => q.eq("documentId", lastVersionId!)).collect())).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();

  const before = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  const nextId = await owner.mutation(api.notes.createNote, {});
  const nextStorageId = await t.run((ctx) => ctx.storage.store(new Blob(["unreferenced"])));
  await owner.mutation(api.uploads.saveUpload, { noteId: nextId, storageId: nextStorageId, filename: "next.png", mimeType: "image/png", size: 12 });
  await owner.mutation(api.notes.softDeleteNote, { id: nextId });
  await owner.mutation(api.notes.deleteNote, { id: nextId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const after = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(after.filter((job) => job.name.endsWith(":backfillReferences"))).toHaveLength(before.filter((job) => job.name.endsWith(":backfillReferences")).length);
  expect(await t.run((ctx) => ctx.db.system.get("_storage", nextStorageId))).toBeNull();
});

it("indexes edits, update snapshots, restores, and retention without leaving stale references", async () => {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const noteId = await owner.mutation(api.notes.createNote, {});
  const [first, second] = await t.run(async (ctx) => Promise.all([
    ctx.storage.store(new Blob(["first"])), ctx.storage.store(new Blob(["second"])),
  ]));
  const firstUrl = await t.run((ctx) => ctx.storage.getUrl(first));
  const secondUrl = await t.run((ctx) => ctx.storage.getUrl(second));
  const original = `<img src="${firstUrl}">`;
  const changed = `<img src="${secondUrl}">`;
  await owner.mutation(api.notes.updateNote, { id: noteId, content: original });
  const versionId = await owner.mutation(api.versions.createVersion, { noteId, title: "Original", content: original });
  await owner.mutation(api.notes.updateNote, { id: noteId, content: changed, saveVersion: true });
  const snapshots = await owner.query(api.versions.listVersions, { noteId });
  expect(await t.run((ctx) => ctx.db.query("fileReferences").collect())).toHaveLength(3);
  await owner.mutation(api.versions.restoreVersion, { noteId, versionId, expected: { title: "Untitled", content: changed } });
  expect(await t.run((ctx) => ctx.db.query("fileReferences").collect())).toHaveLength(4);
  for (let index = 0; index < 50; index++) {
    await owner.mutation(api.versions.createVersion, { noteId, title: `Recent ${index}`, content: "No file" });
  }
  expect(await t.run((ctx) => ctx.db.query("fileReferences").collect())).toMatchObject([{ documentId: noteId }]);
  for (const snapshot of snapshots) {
    expect(await t.run((ctx) => ctx.db.query("fileReferences").withIndex("by_document", (q) => q.eq("documentId", snapshot._id)).collect())).toEqual([]);
  }
  await owner.mutation(api.notes.updateNote, { id: noteId, content: "No file" });
  expect(await t.run((ctx) => ctx.db.query("fileReferences").collect())).toEqual([]);
});

it.each(["note", "canvas", "version"] as const)("protects a %s reference saved after deletion is queued", async (kind) => {
  const t = setup();
  const { client: owner, user } = await account(t, "user");
  // This user's migration has already completed; cleanup must use the index.
  await t.run((ctx) => ctx.db.insert("uploadReferenceBackfills", { userId: user._id, phase: "done", cursor: null }));
  const deletedId = await owner.mutation(api.notes.createNote, {});
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["late reference"])));
  const { url } = await owner.mutation(api.uploads.saveUpload, { noteId: deletedId, storageId, filename: "late.png", mimeType: "image/png", size: 14 });
  await owner.mutation(api.notes.softDeleteNote, { id: deletedId });
  await owner.mutation(api.notes.deleteNote, { id: deletedId });
  const content = `<img src="${url}">`;
  if (kind === "canvas") {
    const id = await owner.mutation(api.canvases.createCanvas, {});
    await owner.mutation(api.canvases.updateCanvas, { id, content });
  } else {
    const noteId = await owner.mutation(api.notes.createNote, { content: kind === "note" ? content : "" });
    if (kind === "version") await owner.mutation(api.versions.createVersion, { noteId, title: "Earlier", content });
  }
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).not.toBeNull();
  expect(await t.run((ctx) => ctx.db.query("pendingUploadCleanup").collect())).toEqual([]);
});

it("bounds file reclamation to 20 pending attachments per mutation", async () => {
  const t = setup();
  const { client: owner, user } = await account(t, "user");
  await t.run((ctx) => ctx.db.insert("uploadReferenceBackfills", { userId: user._id, phase: "done", cursor: null }));
  const id = await owner.mutation(api.notes.createNote, {});
  for (let index = 0; index < 25; index++) {
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob([String(index)])));
    await owner.mutation(api.uploads.saveUpload, { noteId: id, storageId, filename: `${index}.png`, mimeType: "image/png", size: 2 });
  }
  await owner.mutation(api.notes.softDeleteNote, { id });
  await owner.mutation(api.notes.deleteNote, { id });
  vi.runOnlyPendingTimers();
  await t.finishInProgressScheduledFunctions();
  expect(await t.run((ctx) => ctx.db.query("pendingUploadCleanup").collect())).toHaveLength(5);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.query("uploads").collect())).toEqual([]);
  expect(await t.run((ctx) => ctx.db.system.query("_storage").collect())).toEqual([]);
});

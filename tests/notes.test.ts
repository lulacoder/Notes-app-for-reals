import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { setup, account } from "./convex";


describe("authenticated note data", () => {
  it("returns owner-only summaries, preserves search text, and excludes rich HTML", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const ownerId = await owner.mutation(api.notes.createNote, { title: "Owner note" });
    await owner.mutation(api.notes.updateNote, {
      id: ownerId,
      content: `<p>${"Beginning ".repeat(30)}needle-at-the-end</p><img src="https://example.com/image.png">`,
    });
    await other.mutation(api.notes.createNote, { title: "Private other note" });

    const summaries = await owner.query(api.notes.listNoteSummaries);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]._id).toBe(ownerId);
    expect(summaries[0].preview).toHaveLength(150);
    expect(summaries[0].searchText).toContain("needle-at-the-end");
    expect(summaries[0].thumbnail).toBe("https://example.com/image.png");
    expect(summaries[0]).not.toHaveProperty("content");
    expect(summaries[0].searchText).not.toContain("<p>");
    expect(await other.query(api.notes.getNote, { id: ownerId })).toBeNull();
    expect(await t.query(api.notes.listNoteSummaries)).toEqual([]);
  });

  it("counts only the owner's trash and updates after delete and restore", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const id = await owner.mutation(api.notes.createNote, {});
    const otherId = await other.mutation(api.notes.createNote, {});
    await other.mutation(api.notes.softDeleteNote, { id: otherId });
    expect(await owner.query(api.notes.countTrash)).toBe(0);
    await owner.mutation(api.notes.softDeleteNote, { id });
    expect(await owner.query(api.notes.countTrash)).toBe(1);
    expect(await owner.query(api.notes.listNoteSummaries)).toEqual([]);
    await owner.mutation(api.notes.restoreNote, { id });
    expect(await owner.query(api.notes.countTrash)).toBe(0);
    expect(await owner.query(api.notes.listNoteSummaries)).toHaveLength(1);
    expect(await t.query(api.notes.countTrash)).toBe(0);
  });

  it("does not disclose another owner's uploads or attach files to their notes", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, {});
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["private image"])));
    const args = { storageId, filename: "test.png", mimeType: "image/png", size: 13, noteId };
    await owner.mutation(api.uploads.saveUpload, args);
    expect(await owner.query(api.uploads.listNoteUploads, { noteId })).toHaveLength(1);
    expect(await other.query(api.uploads.listNoteUploads, { noteId })).toEqual([]);
    expect(await other.query(api.uploads.getUrl, { storageId })).toBeNull();
    expect(await t.query(api.uploads.getUrl, { storageId })).toBeNull();
    await expect(other.mutation(api.uploads.saveUpload, args)).rejects.toThrow("Note not found");
  });
});

import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

describe("document updates", () => {
  it("skips identical or empty note updates, including unnecessary versions", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.notes.createNote, { title: "Title", content: "<p>Body</p>" });
    await t.run((ctx) => ctx.db.patch(id, { updatedAt: 1 }));
    const before = await owner.query(api.notes.getNote, { id });
    await owner.mutation(api.notes.updateNote, { id });
    await owner.mutation(api.notes.updateNote, { id, title: "Title", saveVersion: true });
    await owner.mutation(api.notes.updateNote, { id, content: "<p>Body</p>", saveVersion: true });
    expect(await owner.query(api.notes.getNote, { id })).toEqual(before);
    expect(await owner.query(api.versions.listVersions, { noteId: id })).toEqual([]);

    await owner.mutation(api.notes.updateNote, { id, title: "Renamed", saveVersion: true });
    expect(await owner.query(api.notes.getNote, { id })).toMatchObject({ title: "Renamed", content: "<p>Body</p>" });
    const versions = await owner.query(api.versions.listVersions, { noteId: id });
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ title: "Title", content: "<p>Body</p>" });
    await owner.mutation(api.notes.updateNote, { id, content: "" });
    expect(await owner.query(api.notes.getNote, { id })).toMatchObject({ title: "Renamed", content: "" });
  });

  it("skips identical canvas updates and supports separate title and content edits", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.canvases.createCanvas, { title: "Canvas" });
    await t.run((ctx) => ctx.db.patch(id, { updatedAt: 1 }));
    const before = await owner.query(api.canvases.getCanvas, { id });
    await owner.mutation(api.canvases.updateCanvas, { id });
    await owner.mutation(api.canvases.updateCanvas, { id, title: "Canvas", content: '{"shapes":[]}' });
    expect(await owner.query(api.canvases.getCanvas, { id })).toEqual(before);
    await owner.mutation(api.canvases.updateCanvas, { id, title: "Renamed" });
    expect(await owner.query(api.canvases.getCanvas, { id })).toMatchObject({ title: "Renamed", content: '{"shapes":[]}' });
    await owner.mutation(api.canvases.updateCanvas, { id, content: '{"shapes":[{"id":"new"}]}' });
    expect(await owner.query(api.canvases.getCanvas, { id })).toMatchObject({ title: "Renamed", content: '{"shapes":[{"id":"new"}]}' });
  });

  it("still rejects unauthorized updates even when the values are unchanged", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const noteId = await owner.mutation(api.notes.createNote, { title: "Private" });
    const canvasId = await owner.mutation(api.canvases.createCanvas, { title: "Private" });
    await expect(other.mutation(api.notes.updateNote, { id: noteId, title: "Private" })).rejects.toThrow("unauthorized");
    await expect(other.mutation(api.canvases.updateCanvas, { id: canvasId, title: "Private" })).rejects.toThrow("unauthorized");
  });

  it("returns owner-only sidebar metadata while keeping full grid previews available", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const other = (await account(t, "user")).client;
    const pinnedId = await owner.mutation(api.canvases.createCanvas, { title: "Pinned" });
    const olderId = await owner.mutation(api.canvases.createCanvas, { title: "Older" });
    const newerId = await owner.mutation(api.canvases.createCanvas, { title: "Newer" });
    const deletedId = await owner.mutation(api.canvases.createCanvas, { title: "Deleted" });
    await other.mutation(api.canvases.createCanvas, { title: "Other owner" });
    const content = JSON.stringify({ shapes: [{ type: "text", text: "Preview ".repeat(1000) }] });
    await t.run(async (ctx) => {
      await ctx.db.patch(pinnedId, { isPinned: true, updatedAt: 1, content });
      await ctx.db.patch(olderId, { updatedAt: 2 });
      await ctx.db.patch(newerId, { updatedAt: 3 });
    });
    await owner.mutation(api.canvases.softDeleteCanvas, { id: deletedId });

    const summaries = await owner.query(api.canvases.listCanvasSummaries);
    expect(summaries.map((canvas) => canvas._id)).toEqual([pinnedId, newerId, olderId]);
    expect(summaries[0]).toEqual({ _id: pinnedId, title: "Pinned", updatedAt: 1, isPinned: true, tagIds: [] });
    expect(summaries.every((canvas) => !("content" in canvas) && !("userId" in canvas))).toBe(true);
    expect(await t.query(api.canvases.listCanvasSummaries)).toEqual([]);
    expect(await owner.query(api.canvases.listCanvases)).toContainEqual(expect.objectContaining({ _id: pinnedId, content }));
  });
});

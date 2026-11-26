import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { api } from "@/convex/_generated/api";
import {
  acknowledgeDraft,
  cacheCatalog,
  cacheNote,
  listDrafts,
  offlineLibrary,
  readCachedNote,
  rebaseDraft,
  recordSubmission,
  writeDraft,
  type NoteText,
} from "@/lib/offline-notes";
import { syncDraft } from "@/lib/offline-sync";
import { account, setup } from "./convex";

const base = { title: "Meeting", content: "<p>Original</p>" };
const backend = setup();
async function fixture() {
  const { user, client } = await account(backend, "user");
  const id = await client.mutation(api.notes.createNote, base);
  const owner = user._id;
  const key = crypto.randomUUID();
  async function edit(text: NoteText) {
    await writeDraft(key, owner, id, base, text);
    return (await listDrafts(owner))[0];
  }
  return { client, owner, key, id, edit };
}

it("caches the catalog separately from opened bodies and isolates accounts", async () => {
  const { client, owner, id } = await fixture();
  const unopened = await client.mutation(api.notes.createNote, { title: "Later" });
  await cacheCatalog(owner, [
    { _id: id, title: base.title },
    { _id: unopened, title: "Later" },
  ]);
  await cacheNote(owner, id, base);
  expect((await offlineLibrary(owner)).available).toEqual(new Set([id]));
  expect((await offlineLibrary(owner)).titles).toHaveLength(2);
  expect(await readCachedNote("another-account", id)).toBeUndefined();
  await cacheCatalog(owner, []);
  expect(await readCachedNote(owner, id)).toBeUndefined();
});

it("replays offline writing and acknowledges an interrupted save without overwriting newer typing", async () => {
  const { client, owner, key, id, edit } = await fixture();
  const first = { ...base, content: "First edit" };
  const last = { ...base, content: "Kept typing" };
  await edit(first);
  await recordSubmission(key, first);
  await edit(last);
  // The server accepted the first save just before the browser closed.
  await client.mutation(api.notes.updateNote, { id, ...first, expected: base });
  const [pending] = await listDrafts(owner);
  expect(await syncDraft(client, pending)).toBeNull();
  expect(await client.query(api.notes.getNote, { id })).toMatchObject(last);
  expect(await listDrafts(owner)).toEqual([]);
  await edit(first);
  await edit(last);
  await acknowledgeDraft(key, first);
  expect((await listDrafts(owner))[0]).toMatchObject({ base: first, text: last });
});

it("keeps conflicting writing until resolved and preserves drafts for deleted notes", async () => {
  const { client, owner, key, id, edit } = await fixture();
  const local = { ...base, content: "Offline version" };
  const other = { ...base, content: "Remote version" };
  const draft = await edit(local);
  await client.mutation(api.notes.updateNote, { id, ...other });
  expect(await syncDraft(client, draft)).toEqual({ draft, remote: other });
  expect(await client.query(api.notes.getNote, { id })).toMatchObject(other);
  await rebaseDraft(key, other);
  expect(await syncDraft(client, (await listDrafts(owner))[0])).toBeNull();
  expect(await client.query(api.notes.getNote, { id })).toMatchObject(local);
  const deletedDraft = await edit(other);
  await client.mutation(api.notes.softDeleteNote, { id });
  expect(await syncDraft(client, deletedDraft)).toEqual({ draft: deletedDraft, remote: null });
  await expect(
    client.mutation(api.notes.updateNote, { id, ...other, activeOnly: true }),
  ).rejects.toThrow();
  expect(await listDrafts(owner)).toHaveLength(1);
});

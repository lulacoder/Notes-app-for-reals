import { openDB, type DBSchema } from "idb";
import type { Id } from "@/convex/_generated/dataModel";

export interface NoteText {
  title: string;
  content: string;
}
export interface NoteTitle {
  _id: Id<"notes">;
  title: string;
}
interface CachedNote extends NoteText {
  owner: string;
  id: Id<"notes">;
}
export interface LocalDraft {
  key: string;
  owner: string;
  id: Id<"notes">;
  base: NoteText;
  text: NoteText;
  updated: number;
  // The server may commit a write just before the tab closes.
  submitted?: NoteText;
}
interface OfflineDatabase extends DBSchema {
  catalogs: { key: string; value: NoteTitle[] };
  notes: { key: [string, Id<"notes">]; value: CachedNote };
  drafts: { key: string; value: LocalDraft; indexes: { owner: string } };
}

const OWNER_KEY = "noteworthy:offline-account";
export function offlineOwner() {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
export function setOfflineOwner(owner: string | null) {
  try {
    if (owner) localStorage.setItem(OWNER_KEY, owner);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* Browser storage may be disabled. */
  }
}
let connection: ReturnType<typeof openDB<OfflineDatabase>> | undefined;
function database() {
  connection ??= openDB<OfflineDatabase>("noteworthy-offline-v1", 1, {
    upgrade(db) {
      db.createObjectStore("catalogs");
      db.createObjectStore("notes", { keyPath: ["owner", "id"] });
      db.createObjectStore("drafts", { keyPath: "key" }).createIndex("owner", "owner");
    },
  }).catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export function sameText(a: NoteText | undefined, b: NoteText) {
  return a?.title === b.title && a.content === b.content;
}
export function noteText(note: NoteText): NoteText {
  return { title: note.title, content: note.content };
}
export async function cacheCatalog(owner: string, titles: NoteTitle[]) {
  const db = await database();
  const tx = db.transaction(["catalogs", "notes"], "readwrite");
  const old = await tx.objectStore("catalogs").get(owner);
  const ids = new Set(titles.map((note) => note._id));
  for (const note of old ?? []) {
    if (!ids.has(note._id)) void tx.objectStore("notes").delete([owner, note._id]);
  }
  await tx.objectStore("catalogs").put(
    titles.map(({ _id, title }) => ({ _id, title })),
    owner,
  );
  await tx.done;
}
export async function cacheNote(owner: string, id: Id<"notes">, text: NoteText) {
  await (await database()).put("notes", { owner, id, ...noteText(text) });
}
export async function listDrafts(owner: string) {
  return (await database()).getAllFromIndex("drafts", "owner", owner);
}
export async function offlineLibrary(owner: string) {
  const db = await database();
  const [catalog, keys, drafts] = await Promise.all([
    db.get("catalogs", owner),
    db.getAllKeys("notes", IDBKeyRange.bound([owner], [owner, []])),
    listDrafts(owner),
  ]);
  const titles = new Map((catalog ?? []).map((note) => [note._id, note]));
  for (const draft of drafts) {
    if (!titles.has(draft.id)) titles.set(draft.id, { _id: draft.id, title: draft.text.title });
  }
  return { titles: [...titles.values()], available: new Set(keys.map((key) => key[1])), drafts };
}
// Remove an account's notes from this device. Drafts are kept when the session
// ended on its own, so unsynced writing can still sync after signing back in.
export async function clearOfflineAccount(owner: string, { keepDrafts }: { keepDrafts: boolean }) {
  const db = await database();
  const tx = db.transaction(["catalogs", "notes", "drafts"], "readwrite");
  void tx.objectStore("catalogs").delete(owner);
  void tx.objectStore("notes").delete(IDBKeyRange.bound([owner], [owner, []]));
  if (!keepDrafts) {
    const drafts = tx.objectStore("drafts");
    for (const key of await drafts.index("owner").getAllKeys(owner)) void drafts.delete(key);
  }
  await tx.done;
}
export async function readCachedNote(owner: string, id: Id<"notes">) {
  return (await database()).get("notes", [owner, id]);
}

// Each editing session owns a draft so two tabs can recover independently.
export async function writeDraft(
  key: string,
  owner: string,
  id: Id<"notes">,
  base: NoteText,
  text: NoteText,
) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const previous = await tx.store.get(key);
  await tx.store.put({
    key,
    owner,
    id,
    base: previous?.base ?? noteText(base),
    text: noteText(text),
    submitted: previous?.submitted,
    updated: Date.now(),
  });
  await tx.done;
}
export async function recordSubmission(key: string, text: NoteText) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const draft = await tx.store.get(key);
  if (draft) await tx.store.put({ ...draft, submitted: noteText(text) });
  await tx.done;
}
export async function acknowledgeDraft(key: string, saved: NoteText) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const draft = await tx.store.get(key);
  if (draft) {
    if (sameText(draft.text, saved)) await tx.store.delete(key);
    else await tx.store.put({ ...draft, base: noteText(saved), submitted: undefined });
  }
  await tx.done;
}
export async function discardDraft(key: string) {
  await (await database()).delete("drafts", key);
}
export async function rebaseDraft(key: string, base: NoteText) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const draft = await tx.store.get(key);
  if (draft) await tx.store.put({ ...draft, base: noteText(base), submitted: undefined });
  await tx.done;
}

export async function recordSubmittedIfCurrent(snapshot: LocalDraft, remote: NoteText) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const current = await tx.store.get(snapshot.key);
  const matches =
    !!current && sameText(snapshot.text, current.text) && sameText(snapshot.base, current.base);
  if (matches) await tx.store.put({ ...current, base: noteText(remote), submitted: snapshot.text });
  await tx.done;
  return matches;
}

export async function resolveRecoveredDraft(snapshot: LocalDraft, base: NoteText | null) {
  const db = await database();
  const tx = db.transaction("drafts", "readwrite");
  const current = await tx.store.get(snapshot.key);
  if (current && sameText(snapshot.text, current.text) && sameText(snapshot.base, current.base)) {
    if (base) await tx.store.put({ ...current, base, submitted: undefined });
    else await tx.store.delete(snapshot.key);
  }
  await tx.done;
}

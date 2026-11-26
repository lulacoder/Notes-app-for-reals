// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { listDrafts } from "@/lib/offline-notes";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { act } from "react";
import { createRoot } from "react-dom/client";

import type { Editor } from "@tiptap/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { expect, it, vi } from "vitest";

import { NoteEditor } from "@/components/NoteEditor";
import { ToastProvider } from "@/components/ui/toast-notification";
import { api } from "@/convex/_generated/api";

import { account, setup } from "./convex";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const ORIGINAL_CONTENT = "<p>Original</p>";
const fetchAccessToken = async () => null;

function useTestAuth() {
  return { isAuthenticated: true, isLoading: false, fetchAccessToken };
}

async function settleAutosave() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2200));
  });
}

// IndexedDB commits finish in a separate browser task after React flushes.
async function waitForEditor(assertion: () => void | Promise<void>) {
  await vi.waitFor(async () => {
    await act(async () => {});
    await assertion();
  });
}

async function openEditors(withVersion = false) {
  const owner = (await account(setup(), "user")).client;
  const id = await owner.mutation(api.notes.createNote, { title: "Title", content: ORIGINAL_CONTENT });
  const note = await owner.query(api.notes.getNote, { id });
  if (!note) throw new Error("Missing test note");
  const tags = await owner.query(api.tags.listTags, {});
  const versionId = withVersion ? await owner.mutation(api.versions.createVersion, { noteId: id, title: "Earlier title", content: "<p>Earlier version</p>" }) : null;
  const versions = await owner.query(api.versions.listVersions, { noteId: id });
  const noteKey = JSON.stringify(["notes:getNote", { id }]);
  const stores = [0, 1].map(() => ({
    reads: new Map<string, unknown>([
      [noteKey, note],
      [JSON.stringify(["tags:listTags", {}]), tags],
      [JSON.stringify(["versions:listVersions", { noteId: id }]), versions],
      ...(versionId ? [[JSON.stringify(["versions:getVersion", { id: versionId }]), versions[0]] as [string, unknown]] : []),
    ]),
    listeners: new Map<string, Set<() => void>>(),
  }));
  const heldResponses = new Map<number, Promise<void>>();
  const releases: Array<() => void> = [];
  let editBeforeRestore: string | null = null;

  async function publishNote(indices = [0, 1]) {
    const current = await owner.query(api.notes.getNote, { id });
    for (const index of indices) {
      stores[index].reads.set(noteKey, current);
      stores[index].listeners.get(noteKey)?.forEach((notify) => notify());
    }
  }

  // Use real editors and backend mutations; replace each client's network transport.
  const clients = [0, 1].map((index) => {
    const client = new ConvexReactClient(`https://note-sync-${index}.convex.cloud`);
    vi.spyOn(client, "setAuth").mockImplementation((_fetch, notify) => notify?.(true));
    vi.spyOn(client, "clearAuth").mockImplementation(() => {});
    vi.spyOn(client, "watchQuery").mockImplementation((query, ...[args]) => {
      const key = JSON.stringify([getFunctionName(query), args ?? {}]);
      const store = stores[index];
      if (!store.reads.has(key)) throw new Error(`Unexpected query: ${key}`);
      return {
        onUpdate(notify) {
          const callbacks = store.listeners.get(key) ?? new Set();
          callbacks.add(notify);
          store.listeners.set(key, callbacks);
          return () => { callbacks.delete(notify); };
        },
        localQueryResult: () => store.reads.get(key),
        localQueryLogs: () => undefined,
        journal: () => undefined,
      };
    });
    vi.spyOn(client, "mutation").mockImplementation(async (reference, ...[args]) => {
      const response = heldResponses.get(index);
      heldResponses.delete(index);
      try {
        if (getFunctionName(reference) === "versions:restoreVersion" && editBeforeRestore !== null) {
          await owner.mutation(api.notes.updateNote, { id, content: editBeforeRestore });
          editBeforeRestore = null;
          await publishNote([1 - index]);
        }
        const result = await owner.mutation(makeFunctionReference<"mutation">(getFunctionName(reference)), args ?? {});
        if (["notes:updateNote", "versions:restoreVersion"].includes(getFunctionName(reference))) {
          if (response) {
            await publishNote([1 - index]);
            await response;
          }
          // A completed Convex mutation has its writes reflected in the subscription.
          await publishNote();
        }
        return result;
      } catch (error) {
        // Decode the wire value as the real Convex client does.
        if (error instanceof ConvexError && typeof error.data === "string") {
          throw new ConvexError(JSON.parse(error.data));
        }
        throw error;
      }
    });
    return client;
  });
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "note-sync",
  };

  // jsdom has no layout; supply the geometry used by the rich text editor.
  const createRange = document.createRange.bind(document);
  vi.spyOn(document, "createRange").mockImplementation(() => Object.assign(createRange(), {
    getClientRects: () => [new DOMRect()],
    getBoundingClientRect: () => new DOMRect(),
  }));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const containers = clients.map(() => document.body.appendChild(document.createElement("div")));
  const roots = containers.map((container) => createRoot(container));
  await act(async () => {
    roots.forEach((root, index) => root.render(
      <AppRouterContext.Provider value={router}>
        <ConvexProviderWithAuth client={clients[index]} useAuth={useTestAuth}>
          <ToastProvider><NoteEditor noteId={id} initialNote={note} /></ToastProvider>
        </ConvexProviderWithAuth>
      </AppRouterContext.Provider>,
    ));
  });
  const editors = containers.map((container) => {
    const element = container.querySelector<HTMLElement & { editor?: Editor }>(".tiptap");
    if (!element?.editor) throw new Error("Missing rich text editor");
    return element.editor;
  });
  await settleAutosave();

  return {
    containers,
    editors,
    readDrafts: () => listDrafts(note.userId),
    readNote: () => owner.query(api.notes.getNote, { id }),
    readVersions: () => owner.query(api.versions.listVersions, { noteId: id }),
    changeBeforeRestore(content: string) { editBeforeRestore = content; },
    async restoreEarlierVersion(index: number) {
      await act(async () => {
        await import("@/components/VersionHistory");
        containers[index].querySelector<HTMLButtonElement>('[title="Version history"]')?.click();
      });
      const preview = containers[index].querySelector<HTMLButtonElement>('[aria-label="Preview Earlier title version"]');
      if (!preview) throw new Error("Missing earlier version");
      await act(async () => preview.click());
      const restore = [...containers[index].querySelectorAll("button")].find((item) => item.textContent?.trim() === "Restore");
      if (!restore) throw new Error("Missing restore button");
      await act(async () => restore.click());
      const confirm = document.querySelector('[role="alertdialog"] button:last-child');
      if (!(confirm instanceof HTMLButtonElement)) throw new Error("Missing restore confirmation");
      await act(async () => confirm.click());
    },
    holdNextSave(index: number) {
      let release = () => {};
      heldResponses.set(index, new Promise<void>((resolve) => { release = resolve; }));
      releases.push(release);
      return release;
    },
    async edit(index: number, content: string) {
      await act(async () => { editors[index].commands.setContent(content); });
    },
    async choose(index: number, label: string) {
      const button = [...containers[index].querySelectorAll("button")]
        .find((item) => item.textContent?.trim() === label);
      if (!button) throw new Error(`Missing button: ${label}`);
      await act(async () => button.click());
    },
    async close() {
      releases.forEach((release) => release());
      await act(async () => roots.forEach((root) => root.unmount()));
      containers.forEach((container) => container.remove());
      await Promise.all(clients.map((client) => client.close()));
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    },
  };
}

it.each([0, 1])("client %i accepts a remote revert to the pre-save content after its save completes", async (source) => {
  const session = await openEditors();
  try {
    const release = session.holdNextSave(source);
    await session.edit(source, "<p>First edit</p>");
    await settleAutosave();
    expect((await session.readNote())?.content).toBe("<p>First edit</p>");
    expect(session.editors[1 - source].getHTML()).toBe("<p>First edit</p>");

    // The other client reverts before the source has observed its own committed save.
    await session.edit(1 - source, ORIGINAL_CONTENT);
    await settleAutosave();
    expect((await session.readNote())?.content).toBe(ORIGINAL_CONTENT);
    expect(session.editors[source].getHTML()).toBe("<p>First edit</p>");

    await act(async () => release());
    await waitForEditor(() => expect(session.editors.map((editor) => editor.getHTML())).toEqual([ORIGINAL_CONTENT, ORIGINAL_CONTENT]));
    await settleAutosave();
    expect(session.containers[source].querySelector('[role="status"]')?.textContent).toBe("Synced");
    expect(session.containers[source].textContent).not.toContain("Choose which version to keep");
  } finally {
    await session.close();
  }
});

it("syncs alternating edits in both directions", async () => {
  const session = await openEditors();
  try {
    for (const [index, content] of [[0, "<p>From A</p>"], [1, "<p>From B</p>"], [0, "<p>From A again</p>"]] as const) {
      await session.edit(index, content);
      await settleAutosave();
      expect((await session.readNote())?.content).toBe(content);
      expect(session.editors.map((editor) => editor.getHTML())).toEqual([content, content]);
      await settleAutosave();
    }
  } finally {
    await session.close();
  }
});

it("preserves typing made while a save is in flight", async () => {
  const session = await openEditors();
  try {
    const release = session.holdNextSave(0);
    await session.edit(0, "<p>Submitted edit</p>");
    await settleAutosave();
    await session.edit(0, "<p>Still typing</p>");
    await vi.waitFor(async () => expect(await session.readDrafts()).toContainEqual(expect.objectContaining({
      text: { title: "Title", content: "<p>Still typing</p>" },
    })));
    await act(async () => release());
    expect(session.editors[0].getHTML()).toBe("<p>Still typing</p>");
    await settleAutosave();
    expect((await session.readNote())?.content).toBe("<p>Still typing</p>");
    expect(session.editors.map((editor) => editor.getHTML())).toEqual(["<p>Still typing</p>", "<p>Still typing</p>"]);
  } finally {
    await session.close();
  }
});

it("preserves a conflicting draft until the user chooses to keep it", async () => {
  const session = await openEditors();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await session.edit(0, "<p>A edit</p>");
    await session.edit(1, "<p>B edit</p>");
    await settleAutosave();
    expect((await session.readNote())?.content).toBe("<p>A edit</p>");
    expect(session.editors[1].getHTML()).toBe("<p>B edit</p>");
    expect(session.containers[1].textContent).toContain("Choose which version to keep");
    await session.choose(1, "Keep my version");
    await waitForEditor(() => expect(session.containers[1].textContent).not.toContain("Choose which version to keep"));
    await settleAutosave();
    expect((await session.readNote())?.content).toBe("<p>B edit</p>");
    expect(session.editors.map((editor) => editor.getHTML())).toEqual(["<p>B edit</p>", "<p>B edit</p>"]);
  } finally {
    error.mockRestore();
    await session.close();
  }
});

it("restores after an in-flight save and snapshots the unsaved draft without a later autosave overwriting it", async () => {
  const session = await openEditors(true);
  try {
    const release = session.holdNextSave(0);
    await session.edit(0, "<p>Submitted edit</p>");
    await settleAutosave();
    await session.edit(0, "<p>Unsaved draft</p>");
    await session.restoreEarlierVersion(0);
    expect((await session.readNote())?.content).toBe("<p>Submitted edit</p>");
    expect(session.containers[0].textContent).toContain("Restoring...");
    expect(session.editors[0].isEditable).toBe(false);
    await act(async () => release());
    await waitForEditor(async () => expect((await session.readNote())?.content).toBe("<p>Earlier version</p>"));
    expect(await session.readVersions()).toContainEqual(expect.objectContaining({ content: "<p>Unsaved draft</p>" }));
    expect(session.editors[0].getHTML()).toBe("<p>Earlier version</p>");
    await settleAutosave();
    expect((await session.readNote())?.content).toBe("<p>Earlier version</p>");
    expect(session.editors.map((editor) => editor.getHTML())).toEqual(["<p>Earlier version</p>", "<p>Earlier version</p>"]);
  } finally {
    await session.close();
  }
});

it("keeps the local draft and reports a conflict when another device changes the note during restoration", async () => {
  const session = await openEditors(true);
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await session.edit(0, "<p>Local draft</p>");
    session.changeBeforeRestore("<p>Remote change</p>");
    await session.restoreEarlierVersion(0);
    await waitForEditor(() => expect(session.containers[0].textContent).toContain("Could not restore version"));
    expect((await session.readNote())?.content).toBe("<p>Remote change</p>");
    expect(session.editors[0].getHTML()).toBe("<p>Local draft</p>");
    expect(session.containers[0].textContent).toContain("Choose which version to keep");
    expect(session.containers[0].textContent).toContain("Could not restore version");
  } finally {
    error.mockRestore();
    await session.close();
  }
});

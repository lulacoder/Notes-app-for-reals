// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../convex/_generated/dataModel";
import { NoteEditor } from "../components/NoteEditor";
import { setup, account } from "./convex";
import { api } from "../convex/_generated/api";

function unavailable() { throw new Error("Navigation is unavailable during server rendering"); }
const router = {
  back: unavailable, forward: unavailable, refresh: unavailable,
  push: unavailable, replace: unavailable, prefetch: unavailable, bfcacheId: "ssr-test",
};
function usePendingAuth() {
  return { isLoading: true, isAuthenticated: false, fetchAccessToken: async () => null };
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => { vi.restoreAllMocks(); });

async function mountLoadedEditor() {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const id = await owner.mutation(api.notes.createNote, { title: "Original", content: "<p>Keep this body</p>" });
  const note = await owner.query(api.notes.getNote, { id });
  const tags = await owner.query(api.tags.listTags);
  const client = new ConvexReactClient("https://ssr-test.convex.cloud");
  // The tag picker subscribes even while auth is pending. Supply its real data
  // without opening a cloud WebSocket from the jsdom test environment.
  vi.spyOn(client, "watchQuery").mockImplementation((...[query]: Parameters<ConvexReactClient["watchQuery"]>) => {
    if (getFunctionName(query) !== getFunctionName(api.tags.listTags)) {
      throw new Error(`Unexpected query: ${getFunctionName(query)}`);
    }
    return {
      onUpdate: () => () => {}, localQueryResult: () => tags,
      localQueryLogs: () => undefined, journal: () => undefined,
    };
  });
  const mutation = vi.spyOn(client, "mutation").mockImplementation(
    async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) => owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {}),
  );
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(
    <AppRouterContext.Provider value={router}>
      <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
        <NoteEditor noteId={id} initialNote={note} />
      </ConvexProviderWithAuth>
    </AppRouterContext.Provider>,
  ));

  async function rename(title: string) {
    const input = container.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!input || !setter) throw new Error("Missing note title input");
    await act(async () => {
      setter.call(input, title);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function cleanup() {
    await act(async () => root.unmount());
    vi.useRealTimers();
    await client.close();
  }
  return { id, owner, mutation, rename, cleanup, root };
}

describe("server-loaded note editor", () => {
  it("sends only the changed title and skips a draft reverted before saving", async () => {
    const editor = await mountLoadedEditor();
    vi.useFakeTimers();
    try {
      await editor.rename("Temporary");
      await editor.rename("Original");
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(editor.mutation).not.toHaveBeenCalled();
      await editor.rename("Renamed");
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(editor.mutation).toHaveBeenCalledTimes(1);
      expect(editor.mutation.mock.calls[0][1]).toEqual({ id: editor.id, title: "Renamed" });
      expect(await editor.owner.query(api.notes.getNote, { id: editor.id })).toMatchObject({ title: "Renamed", content: "<p>Keep this body</p>" });
    } finally {
      await editor.cleanup();
    }
  });

  it("submits a revert even while the previous save is awaiting confirmation", async () => {
    const editor = await mountLoadedEditor();
    let confirm: () => void = () => {};
    const confirmation = new Promise<void>((resolve) => { confirm = resolve; });
    editor.mutation.mockImplementationOnce(async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) => {
      const result = await editor.owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {});
      await confirmation;
      return result;
    });
    vi.useFakeTimers();
    try {
      await editor.rename("In flight");
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      await editor.rename("Original");
      await act(async () => editor.root.render(null));
      expect(editor.mutation.mock.calls.map((call) => call[1])).toEqual([
        { id: editor.id, title: "In flight" },
      ]);
      await act(async () => { confirm(); });
      expect(editor.mutation.mock.calls.map((call) => call[1])).toEqual([
        { id: editor.id, title: "In flight" },
        { id: editor.id, title: "Original" },
      ]);
      expect(await editor.owner.query(api.notes.getNote, { id: editor.id })).toMatchObject({ title: "Original" });
    } finally {
      confirm();
      await editor.cleanup();
    }
  });

  it("renders the loaded title before the browser authenticates or subscribes", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.notes.createNote, { title: "Already loaded title" });
    await owner.mutation(api.notes.updateNote, { id, content: "<p>Already loaded body</p>" });
    const note: Doc<"notes"> | null = await owner.query(api.notes.getNote, { id });
    const client = new ConvexReactClient("https://ssr-test.convex.cloud");
    try {
      const html = renderToString(
        <AppRouterContext.Provider value={router}>
          <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
            <NoteEditor noteId={id} initialNote={note} />
          </ConvexProviderWithAuth>
        </AppRouterContext.Provider>,
      );
      expect(html).toContain('value="Already loaded title"');
      expect(html).toContain("Already loaded body");
      expect(html).not.toContain("Loading note");
    } finally {
      await client.close();
    }
  });

  it("does not autosave empty state while waiting for authentication and note data", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.notes.createNote, { title: "Keep this title" });
    const client = new ConvexReactClient("https://ssr-test.convex.cloud");
    const mutation = vi.spyOn(client, "mutation");
    const container = document.createElement("div");
    const root = createRoot(container);
    vi.useFakeTimers();
    try {
      await act(async () => {
        root.render(
          <AppRouterContext.Provider value={router}>
            <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
              <NoteEditor noteId={id} />
            </ConvexProviderWithAuth>
          </AppRouterContext.Provider>,
        );
      });
      await act(async () => { await vi.advanceTimersByTimeAsync(6 * 60 * 1000); });
      expect(mutation).not.toHaveBeenCalled();
    } finally {
      await act(async () => { root.unmount(); });
      vi.useRealTimers();
      await client.close();
    }
  });
});

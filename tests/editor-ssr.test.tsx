// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { describe, expect, it, vi } from "vitest";
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

describe("server-loaded note editor", () => {
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

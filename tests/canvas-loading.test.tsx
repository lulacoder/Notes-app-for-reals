// @vitest-environment jsdom
import { getFunctionName, makeFunctionReference } from "convex/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { preloadQuery } from "convex/nextjs";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { describe, expect, it, vi } from "vitest";
import { CanvasEditorPageClient } from "../app/(dashboard)/(workspace)/canvas/[id]/CanvasEditorPageClient";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";
import { ToastProvider } from "../components/ui/toast-notification";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function unavailable() { throw new Error("Unexpected navigation during the loading test"); }
const router = {
  back: unavailable, forward: unavailable, refresh: unavailable,
  push: unavailable, replace: unavailable, prefetch: unavailable, bfcacheId: "canvas-test",
};

function useUnauthenticated() {
  return { isLoading: false, isAuthenticated: false, fetchAccessToken: async () => null };
}

describe("canvas loading during authentication changes", () => {
  it("shows a placeholder when auth expires the preload before a live query is ready", async () => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.canvases.createCanvas, { title: "Loaded canvas" });
    // Use Convex's real preload serialization with the in-memory database as
    // transport, so this regression test does not require a cloud deployment.
    const transport = vi.spyOn(ConvexHttpClient.prototype, "query").mockImplementation(
      async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => owner.query(makeFunctionReference<"query">(getFunctionName(query)), args ?? {}),
    );
    const preloaded = await preloadQuery(api.canvases.getCanvas, { id }, { url: "https://canvas-loading-test.convex.cloud" });
    transport.mockRestore();
    const client = new ConvexReactClient("https://canvas-loading-test.convex.cloud");
    const container = document.createElement("div");
    const errors: unknown[] = [];
    const root = createRoot(container, { onUncaughtError: (error) => errors.push(error) });
    try {
      await act(async () => {
        root.render(
          <AppRouterContext.Provider value={router}>
            <ConvexProviderWithAuth client={client} useAuth={useUnauthenticated}>
              <ToastProvider><CanvasEditorPageClient canvasId={id} preloadedCanvas={preloaded} /></ToastProvider>
            </ConvexProviderWithAuth>
          </AppRouterContext.Provider>,
        );
      });
      expect(errors).toEqual([]);
      expect(container.querySelector('[aria-label="Loading document"]')).not.toBeNull();
      expect(container.textContent).not.toContain("Loaded canvas");
    } finally {
      await act(async () => root.unmount());
      await client.close();
    }
  });
});

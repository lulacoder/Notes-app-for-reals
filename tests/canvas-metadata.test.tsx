// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { preloadQuery } from "convex/nextjs";
import { getFunctionName, makeFunctionReference } from "convex/server";
import { afterEach, expect, it, vi } from "vitest";

import { CanvasEditorPageClient } from "../app/(dashboard)/(workspace)/canvas/[id]/CanvasEditorPageClient";
import { ToastProvider } from "../components/ui/toast-notification";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function unavailable() {
  throw new Error("Unexpected navigation");
}
const router = {
  back: unavailable,
  forward: unavailable,
  refresh: unavailable,
  push: unavailable,
  replace: unavailable,
  prefetch: unavailable,
  bfcacheId: "metadata-test",
};
function usePendingAuth() {
  return {
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("disables busy controls and queues an earlier tag creation that finishes during a title save", async () => {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const id = await owner.mutation(api.canvases.createCanvas, {
    title: "Loaded canvas",
  });
  const transport = vi
    .spyOn(ConvexHttpClient.prototype, "query")
    .mockImplementation(
      async (...[query, args]: Parameters<ConvexHttpClient["query"]>) =>
        owner.query(makeFunctionReference<"query">(getFunctionName(query)), args ?? {}),
    );
  const preloaded = await preloadQuery(
    api.canvases.getCanvas,
    { id },
    { url: "https://metadata-test.convex.cloud" },
  );
  transport.mockRestore();
  const tags = await owner.query(api.tags.listTags);
  const client = new ConvexReactClient("https://metadata-test.convex.cloud");
  vi.spyOn(client, "watchQuery").mockImplementation(() => ({
    onUpdate: () => () => {},
    localQueryResult: () => tags,
    localQueryLogs: () => undefined,
    journal: () => undefined,
  }));
  const tagResponse = Promise.withResolvers<void>();
  const titleResponse = Promise.withResolvers<void>();
  const mutation = vi
    .spyOn(client, "mutation")
    .mockImplementation(
      async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) => {
        if (getFunctionName(query) === getFunctionName(api.tags.createTag))
          await tagResponse.promise;
        if (
          getFunctionName(query) === getFunctionName(api.canvases.updateCanvas)
        )
          await titleResponse.promise;
        return owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {});
      },
    );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  function button(label: string) {
    const found = [...document.querySelectorAll("button")].find(
      (item) =>
        item.getAttribute("aria-label") === label ||
        item.title === label ||
        item.textContent?.trim() === label,
    );
    if (!found) throw new Error(`Missing button: ${label}`);
    return found;
  }
  async function input(selector: string, value: string) {
    const field = document.querySelector(selector);
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!(field instanceof HTMLInputElement) || !setter)
      throw new Error(`Missing field: ${selector}`);
    await act(async () => {
      setter.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  try {
    await act(async () =>
      root.render(
        <AppRouterContext.Provider value={router}>
          <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
            <ToastProvider>
              <CanvasEditorPageClient
                canvasId={id}
                preloadedCanvas={preloaded}
              />
            </ToastProvider>
          </ConvexProviderWithAuth>
        </AppRouterContext.Provider>,
      ),
    );
    await act(async () => button("Loaded canvas").click());
    await act(async () => button("Manage tags").click());
    await input('input[placeholder="New tag"]', "Release label");
    const field = document.querySelector('input[placeholder="New tag"]');
    const createTag = field?.parentElement?.querySelector("button");
    if (!createTag) throw new Error("Missing tag creation action");
    await act(async () => createTag.click());
    await act(async () => button("Manage tags").click());
    await input('input[aria-label="Canvas title"]', "Renamed canvas");
    await act(async () => button("Save canvas title").click());
    expect(button("Manage tags").disabled).toBe(true);
    expect(button("Canvas options").disabled).toBe(true);
    expect(button("Save canvas title").disabled).toBe(true);
    await act(async () => tagResponse.resolve());
    // The tag assignment waits behind the title write instead of being dropped.
    expect(mutation).toHaveBeenCalledTimes(2);
    await act(async () => titleResponse.resolve());
    const saved = await owner.query(api.canvases.getCanvas, { id });
    const [createdTag] = await owner.query(api.tags.listTags);
    expect(saved).toMatchObject({
      title: "Renamed canvas",
      tagIds: [createdTag._id],
    });
    expect(button("Manage tags").disabled).toBe(false);
    expect(button("Canvas options").disabled).toBe(false);
    expect(mutation).toHaveBeenCalledTimes(3);
  } finally {
    tagResponse.resolve();
    titleResponse.resolve();
    await act(async () => root.unmount());
    container.remove();
    await client.close();
  }
});

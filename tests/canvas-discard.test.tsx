// @vitest-environment jsdom
import { getFunctionName, makeFunctionReference } from "convex/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { afterEach, expect, it, vi } from "vitest";

import { CanvasEditor } from "../components/CanvasEditor";
import { ToastProvider } from "../components/ui/toast-notification";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { readShapes, serializeShapes, type Shape } from "../lib/canvas/model";
import { account, setup } from "./convex";

vi.mock("convex/react", async (original) => ({
  ...(await original<typeof import("convex/react")>()),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
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
  bfcacheId: "discard-test",
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("restores the chosen server version after an in-flight save and never submits a discarded queued canvas", async () => {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const id = await owner.mutation(api.canvases.createCanvas, {
    title: "Shared canvas",
  });
  const sticky: Shape = {
    id: "idea",
    type: "sticky",
    x: 20,
    y: 30,
    width: 210,
    height: 170,
    text: "Original",
    colorIndex: 0,
    stroke: "#000",
    strokeWidth: 1,
  };
  await owner.mutation(api.canvases.updateCanvas, {
    id,
    content: serializeShapes([sticky]),
  });
  const initial = await owner.query(api.canvases.getCanvas, { id });
  if (!initial) throw new Error("Missing canvas");
  const client = new ConvexReactClient("https://discard-test.convex.cloud");
  const inFlight = Promise.withResolvers<void>();
  const mutation = vi
    .spyOn(client, "mutation")
    .mockImplementationOnce(
      async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) => {
        await inFlight.promise;
        return owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {});
      },
    )
    .mockImplementation(
      async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) =>
        owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {}),
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
  function render(canvas: Doc<"canvases">) {
    root.render(
      <AppRouterContext.Provider value={router}>
        <ConvexProvider client={client}>
          <ToastProvider>
            <CanvasEditor canvasId={id} initialCanvas={canvas} />
          </ToastProvider>
        </ConvexProvider>
      </AppRouterContext.Provider>,
    );
  }
  function button(label: string) {
    const found = [...document.querySelectorAll("button")].find(
      (item) =>
        item.getAttribute("aria-label") === label ||
        item.textContent?.trim() === label,
    );
    if (!found) throw new Error(`Missing button: ${label}`);
    return found;
  }
  async function click(label: string) {
    await act(async () => button(label).click());
  }
  async function edit(value: string) {
    await click("Edit");
    const field = document.querySelector("textarea");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (!field || !setter) throw new Error("Missing text editor");
    await act(async () => {
      setter.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = field.closest("form");
    if (!form) throw new Error("Missing idea form");
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  }
  try {
    await act(async () => render(initial));
    await act(async () =>
      button("Canvas actions").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    const select = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent?.includes("Select an object"),
    );
    if (!(select instanceof HTMLElement))
      throw new Error("Missing object list action");
    await act(async () => select.click());
    await click("1. Original");
    vi.useFakeTimers();
    await edit("Local A");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await edit("Discarded B");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const chosen = serializeShapes([
      { ...sticky, text: "Chosen server version" },
    ]);
    await owner.mutation(api.canvases.updateCanvas, { id, content: chosen });
    const remote = await owner.query(api.canvases.getCanvas, { id });
    if (!remote) throw new Error("Missing remote canvas");
    await act(async () => render(remote));
    await click("Load saved version");
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    await act(async () => inFlight.resolve());
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(mutation).toHaveBeenCalledTimes(2);
    const sent = mutation.mock.calls.map((call) => {
      const args = call[1];
      return args && "content" in args && typeof args.content === "string"
        ? readShapes(args.content)[0]
        : null;
    });
    expect(sent).toMatchObject([
      { text: "Local A" },
      { text: "Chosen server version" },
    ]);
    expect((await owner.query(api.canvases.getCanvas, { id }))?.content).toBe(
      chosen,
    );
    expect(sessionStorage.getItem(`noteworthy:canvas-draft:${id}`)).toBeNull();
    expect(container.textContent).not.toContain(
      "This canvas changed in another tab",
    );
  } finally {
    inFlight.resolve();
    await act(async () => root.unmount());
    container.remove();
    await client.close();
  }
});

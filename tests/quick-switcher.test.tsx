// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { Preloaded } from "convex/react";

import { QuickSwitcher } from "../components/QuickSwitcher";
import type { PreloadedCanvases, PreloadedNotes } from "../lib/notes-data";
import type { api } from "../convex/_generated/api";

const data = vi.hoisted(() => ({
  notes: [{ _id: "note1", title: "Garden plans", searchText: "tomato seeds", updatedAt: Date.now(), tagIds: [], isPinned: false }],
  canvases: [{ _id: "canvas1", title: "Project map", updatedAt: Date.now(), isPinned: true }],
}));
vi.mock("../lib/use-notes-queries", () => ({ useNoteSummaries: () => data.notes }));
vi.mock("@convex-dev/better-auth/nextjs/client", () => ({
  usePreloadedAuthQuery: (preloaded: string) => preloaded === "canvases" ? data.canvases : [],
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => { document.body.innerHTML = ""; });

it("searches note content and canvas titles and opens the selected result", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const selectNote = vi.fn();
  const selectCanvas = vi.fn();
  const onOpenChange = vi.fn();
  try {
    await act(async () => root.render(<QuickSwitcher open onOpenChange={onOpenChange} onSelectNote={selectNote} onSelectCanvas={selectCanvas} preloadedNotes={"notes" as unknown as PreloadedNotes} preloadedCanvases={"canvases" as unknown as PreloadedCanvases} preloadedTags={"tags" as unknown as Preloaded<typeof api.tags.listTags>} />));
    const input = document.querySelector('input[aria-label="Search notes and canvases"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(document.body.textContent).toContain("Garden plans");
    expect(document.body.textContent).toContain("Project map");
    async function search(value: string) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await search("tomato");
    expect(document.querySelector('[cmdk-item][data-value="note:note1"]')).toBeTruthy();
    expect(document.querySelector('[cmdk-item][data-value="canvas:canvas1"]')).toBeNull();
    await search("project");
    expect(document.querySelector('[cmdk-item][data-value="note:note1"]')).toBeNull();
    const canvas = document.querySelector('[cmdk-item][data-value="canvas:canvas1"]') as HTMLElement;
    expect(canvas).toBeTruthy();
    await act(async () => canvas.click());
    expect(selectCanvas).toHaveBeenCalledWith("canvas1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await search("garden");
    const note = document.querySelector('[cmdk-item][data-value="note:note1"]') as HTMLElement;
    await act(async () => note.click());
    expect(selectNote).toHaveBeenCalledWith("note1");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { Preloaded } from "convex/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasListPageClient } from "@/app/(dashboard)/(workspace)/canvas/CanvasListPageClient";
import { KanbanPageClient } from "@/app/(dashboard)/kanban/KanbanPageClient";
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
  onNavigate: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: (reference: FunctionReference<"mutation">) =>
    (args: unknown) => mocks.mutate(getFunctionName(reference), args),
  useConvex: () => ({}),
  useQuery: () => [],
}));
vi.mock("@convex-dev/better-auth/nextjs/client", () => ({
  usePreloadedAuthQuery: (preloaded: { _valueJSON: string }) => JSON.parse(preloaded._valueJSON),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/ui/toast-notification", () => ({
  useToast: () => ({}),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;

function emptyQuery<Query extends FunctionReference<"query">>(reference: Query): Preloaded<Query> {
  return { __type: reference, _name: getFunctionName(reference), _argsJSON: "{}", _valueJSON: "[]" };
}

function CanvasPage() {
  return <CanvasListPageClient preloadedCanvases={emptyQuery(api.canvases.listCanvases)} />;
}

function NotesSidebar() {
  return <Sidebar
    selectedNoteId={null}
    selectedCanvasId={null}
    onNavigate={mocks.onNavigate}
    onSelectNote={() => {}}
    onOpenTrash={() => {}}
    preloadedNotes={emptyQuery(api.notes.listNoteSummaries)}
    preloadedTags={emptyQuery(api.tags.listTags)}
    preloadedCanvases={emptyQuery(api.canvases.listCanvasSummaries)}
    preloadedTrashCount={emptyQuery(api.notes.countTrash)}
  />;
}

function KanbanPage() {
  return <KanbanPageClient
    preloadedBoards={emptyQuery(api.kanban.listBoards)}
    preloadedTags={emptyQuery(api.tags.listTags)}
    initialBoardData={null}
  />;
}

function button(parent: ParentNode, label: string) {
  const found = [...parent.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

function dialog() {
  const found = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1);
  if (!found) throw new Error("Missing creation dialog");
  return found;
}

function titleInput() {
  const found = dialog().querySelector<HTMLInputElement>('input[name="title"]');
  if (!found) throw new Error("Missing title input");
  return found;
}

async function enterTitle(value: string) {
  await act(async () => {
    const input = titleInput();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function submit() {
  const form = dialog().querySelector("form");
  if (!form) throw new Error("Missing creation form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutate.mockResolvedValue("created-id");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(async () => {
  await act(async () => root.unmount());
  // Radix restores focus on the next tick; finish before jsdom is torn down.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("workspace creation entry points", () => {
  it.each([
    { label: "canvas page", Example: CanvasPage, trigger: "New Canvas", mutation: "canvases:createCanvas" },
    { label: "canvas empty state", Example: CanvasPage, trigger: "Create Canvas", mutation: "canvases:createCanvas" },
    { label: "notes sidebar", Example: NotesSidebar, trigger: "Canvas", mutation: "canvases:createCanvas" },
    { label: "board sidebar", Example: KanbanPage, trigger: "New board", mutation: "kanban:createBoard" },
    { label: "board empty state", Example: KanbanPage, trigger: "Create your first board", mutation: "kanban:createBoard" },
  ])("asks for a title from the $label before creating anything", async ({ Example, trigger, mutation }) => {
    const history = vi.spyOn(window.history, "pushState");
    await act(async () => root.render(<Example />));
    await act(async () => button(container, trigger).click());
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(titleInput());
    await enterTitle("  Product planning  ");
    await act(async () => submit());

    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith(mutation, { title: "Product planning" });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    if (mutation === "canvases:createCanvas") {
      expect(mocks.push).toHaveBeenCalledWith("/canvas/created-id");
    } else {
      expect(history).toHaveBeenCalledWith(null, "", "/kanban?board=created-id");
    }
    if (trigger === "Canvas") expect(mocks.onNavigate).toHaveBeenCalledOnce();
  });

  it("cancels back to the mobile board drawer and closes both dialogs after creation", async () => {
    await act(async () => root.render(<KanbanPage />));
    await act(async () => button(container, "Boards").click());
    const drawer = dialog();
    const trigger = button(drawer, "New board");
    await act(async () => trigger.click());
    await act(async () => button(dialog(), "Cancel").click());
    expect(dialog()).toBe(drawer);
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(mocks.mutate).not.toHaveBeenCalled();
    await act(async () => trigger.click());
    await enterTitle("Mobile board");
    await act(async () => submit());
    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith("kanban:createBoard", { title: "Mobile board" });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe("workspace creation dialog", () => {
  it.each(["Cancel", "Close", "Escape"])("discards a draft with %s and restores focus without creating", async (dismiss) => {
    const onCreate = vi.fn();
    await act(async () => root.render(
      <CreateWorkspaceDialog kind="canvas" onCreate={onCreate}><Button>New canvas</Button></CreateWorkspaceDialog>,
    ));
    const trigger = button(container, "New canvas");
    await act(async () => trigger.click());
    await enterTitle("Discard me");
    await act(async () => {
      if (dismiss === "Escape") {
        titleInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      } else {
        button(dialog(), dismiss).click();
      }
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onCreate).not.toHaveBeenCalled();
    await act(async () => trigger.click());
    expect(titleInput().value).toBe("");
  });

  it.each(["canvas", "board"] as const)("allows a blank %s title so Convex can apply its default", async (kind) => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    await act(async () => root.render(
      <CreateWorkspaceDialog kind={kind} onCreate={onCreate}><Button>New item</Button></CreateWorkspaceDialog>,
    ));
    await act(async () => button(container, "New item").click());
    expect(titleInput().placeholder).toBe(kind === "canvas" ? "Untitled Canvas" : "Untitled Board");
    await enterTitle("   ");
    await act(async () => submit());
    expect(onCreate).toHaveBeenCalledExactlyOnceWith("");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("prevents duplicate submissions and dismissal during creation, then preserves a failed draft for retry", async () => {
    let reject: (cause: Error) => void = () => {};
    const onCreate = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }))
      .mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => root.render(
      <CreateWorkspaceDialog kind="board" onCreate={onCreate}><Button>New board</Button></CreateWorkspaceDialog>,
    ));
    await act(async () => button(container, "New board").click());
    await enterTitle("Release plan");
    await act(async () => { submit(); submit(); });
    expect(onCreate).toHaveBeenCalledOnce();
    expect(titleInput().disabled).toBe(true);
    expect(button(dialog(), "Cancel").disabled).toBe(true);
    expect(button(dialog(), "Creating...").disabled).toBe(true);
    await act(async () => titleInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () => reject(new Error("Offline")));
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain("Offline");
    expect(titleInput().value).toBe("Release plan");
    expect(titleInput().disabled).toBe(false);
    await act(async () => submit());
    expect(onCreate).toHaveBeenNthCalledWith(2, "Release plan");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

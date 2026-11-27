// @vitest-environment jsdom
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

const fetchAccessToken = async () => null;

function useTestAuth() {
  return { isAuthenticated: true, isLoading: false, fetchAccessToken };
}

function findButton(parent: ParentNode, label: string) {
  const button = [...parent.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

function pressKey(element: HTMLElement, key: string) {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

async function openMenu(trigger: HTMLButtonElement) {
  await act(async () => {
    trigger.focus();
    pressKey(trigger, "Enter");
  });
  const menu = document.querySelector<HTMLElement>('[role="menu"]');
  if (!menu) throw new Error("Missing dropdown menu");
  return menu;
}

async function choose(trigger: HTMLButtonElement, label: string) {
  const menu = await openMenu(trigger);
  const item = [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
    .find((option) => option.textContent?.trim() === label);
  if (!item) throw new Error(`Missing dropdown option: ${label}`);
  await act(async () => {
    item.focus();
    pressKey(item, "Enter");
  });
}

it("creates a linked task from selected note text and stays in the note after saving", async () => {
  const { client: owner } = await account(setup(), "user");
  const before = "Next step: ";
  const action = "Send the client a revised mockup";
  const noteId = await owner.mutation(api.notes.createNote, {
    title: "Client meeting notes",
    content: `<p>${before}<strong>${action}</strong> by Friday.</p>`,
  });
  const boardId = await owner.mutation(api.kanban.createBoard, { title: "Website redesign" });
  await owner.mutation(api.kanban.createBoard, { title: "Other project" });
  const [note, boards, columns, tags] = await Promise.all([
    owner.query(api.notes.getNote, { id: noteId }),
    owner.query(api.kanban.listBoards, {}),
    owner.query(api.kanban.listColumns, { boardId }),
    owner.query(api.tags.listTags, {}),
  ]);
  if (!note) throw new Error("Missing test note");

  const client = new ConvexReactClient("https://note-task-test.convex.cloud");
  // Replace the transport while using real subscriptions in React and real Convex mutations.
  const auth = vi.spyOn(client, "setAuth").mockImplementation((_fetch, notify) => notify?.(true));
  const clearAuth = vi.spyOn(client, "clearAuth").mockImplementation(() => {});
  // The editor reads connection state; keep it connected without opening a socket.
  const connected = { isWebSocketConnected: true } as ReturnType<typeof client.connectionState>;
  vi.spyOn(client, "connectionState").mockReturnValue(connected);
  vi.spyOn(client, "subscribeToConnectionState").mockReturnValue(() => {});
  const reads = new Map<string, unknown>([
    [JSON.stringify(["notes:getNote", { id: noteId }]), note],
    [JSON.stringify(["kanban:listBoards", {}]), boards],
    [JSON.stringify(["kanban:listColumns", { boardId }]), columns],
    [JSON.stringify(["tags:listTags", {}]), tags],
  ]);
  const listeners = new Map<string, Set<() => void>>();
  const noteKey = JSON.stringify(["notes:getNote", { id: noteId }]);
  async function publishNote() {
    reads.set(noteKey, await owner.query(api.notes.getNote, { id: noteId }));
    listeners.get(noteKey)?.forEach((notify) => notify());
  }
  const watch = vi.spyOn(client, "watchQuery").mockImplementation((query, ...[args]) => {
    const key = JSON.stringify([getFunctionName(query), args ?? {}]);
    if (!reads.has(key)) throw new Error(`Unexpected query: ${key}`);
    return {
      onUpdate: (notify) => {
        const callbacks = listeners.get(key) ?? new Set();
        callbacks.add(notify);
        listeners.set(key, callbacks);
        return () => { callbacks.delete(notify); };
      },
      localQueryResult: () => reads.get(key),
      localQueryLogs: () => undefined,
      journal: () => undefined,
    };
  });
  const mutation = vi.spyOn(client, "mutation").mockImplementation(
    async (reference, ...[args]) => {
      try {
        const result = await owner.mutation(makeFunctionReference<"mutation">(getFunctionName(reference)), args ?? {});
        if (getFunctionName(reference) === "notes:updateNote") await publishNote();
        return result;
      } catch (error) {
        // The real Convex client decodes error data received over the wire.
        if (error instanceof ConvexError && typeof error.data === "string") {
          throw new ConvexError(JSON.parse(error.data));
        }
        throw error;
      }
    },
  );
  const router: AppRouterInstance = {
    back() {},
    forward() {},
    refresh() {},
    push: vi.fn(),
    replace() {},
    prefetch() {},
    bfcacheId: "test-note",
  };

  // jsdom implements DOM ranges without layout. Supply geometry for the selection popup.
  const createRange = document.createRange.bind(document);
  const ranges = vi.spyOn(document, "createRange").mockImplementation(() =>
    Object.assign(createRange(), {
      getClientRects: () => [new DOMRect()],
      getBoundingClientRect: () => new DOMRect(),
    }),
  );
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <AppRouterContext.Provider value={router}>
          <ConvexProviderWithAuth client={client} useAuth={useTestAuth}>
            <ToastProvider><NoteEditor noteId={noteId} initialNote={note} /></ToastProvider>
          </ConvexProviderWithAuth>
        </AppRouterContext.Provider>,
      );
    });
    const editor = container.querySelector<HTMLElement & { editor?: Editor }>(".tiptap");
    if (!editor?.editor) throw new Error("Missing rich text editor");
    expect(container.textContent).not.toContain("Create task");
    await act(async () => {
      editor.focus();
      const from = before.length + 1;
      editor.editor?.commands.setTextSelection({ from, to: from + action.length });
      await vi.waitFor(() => findButton(container, "Create task"));
    });
    await act(async () => findButton(container, "Create task").click());
    await act(async () => vi.dynamicImportSettled());
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) throw new Error("Missing create task dialog");
    expect(dialog.querySelector("input")?.value).toBe(action);
    expect(dialog.textContent).toContain("Client meeting notes");
    expect(findButton(dialog, "Create task").disabled).toBe(true);

    const boardPicker = dialog.querySelector<HTMLButtonElement>('button[aria-label="Board: Choose a board"]');
    const columnPicker = dialog.querySelector<HTMLButtonElement>('button[aria-label="Column: Choose a board first"]');
    if (!boardPicker || !columnPicker) throw new Error("Missing task destination pickers");
    expect(columnPicker.disabled).toBe(true);

    const menu = await openMenu(boardPicker);
    await act(async () => pressKey(menu, "Escape"));
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);

    await choose(boardPicker, "Website redesign");
    expect(boardPicker.getAttribute("aria-label")).toBe("Board: Website redesign");
    expect(findButton(dialog, "Create task").disabled).toBe(true);
    await choose(columnPicker, columns[1].title);
    await act(async () => findButton(dialog, "Create task").click());

    const cards = await owner.query(api.kanban.listCards, { boardId });
    expect(cards).toMatchObject([{ title: action, sourceNoteId: noteId, columnId: columns[1]._id }]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector(".tiptap")).toBe(editor);
    expect(router.push).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Task created");
    await act(async () => findButton(container, "View task").click());
    expect(router.push).toHaveBeenCalledWith(`/kanban?board=${boardId}&card=${cards[0]._id}`);

    const title = container.querySelector<HTMLInputElement>('input[placeholder="Untitled"]');
    if (!title) throw new Error("Missing title input");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(title, "");
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(async () => {
        expect((await owner.query(api.notes.getNote, { id: noteId }))?.title).toBe("Untitled");
      }, { timeout: 4000 });
    });
    await owner.mutation(api.notes.updateNote, { id: noteId, content: "<p>Changed on another device</p>" });
    await act(async () => publishNote());
    await act(async () => {
      await vi.waitFor(() => expect(editor.textContent).toContain("Changed on another device"));
    });
    await act(async () => {
      editor.editor?.commands.setContent("<p>Local edits</p>");
    });
    await owner.mutation(api.notes.updateNote, { id: noteId, content: "<p>Other edits</p>" });
    await act(async () => publishNote());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200));
    });
    expect(container.textContent).toContain("Choose which version to keep");
    expect(editor.textContent).toContain("Local edits");
    await act(async () => findButton(container, "Use other version").click());
    expect(editor.textContent).toContain("Other edits");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    ranges.mockRestore();
    auth.mockRestore();
    clearAuth.mockRestore();
    watch.mockRestore();
    mutation.mockRestore();
    vi.unstubAllGlobals();
    await client.close();
  }
}, 12000);

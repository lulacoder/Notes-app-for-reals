// @vitest-environment jsdom
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { act } from "react";
import { createRoot } from "react-dom/client";

import type { Editor } from "@tiptap/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { getFunctionName, makeFunctionReference } from "convex/server";
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

function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
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
  const reads = new Map<string, unknown>([
    [JSON.stringify(["notes:getNote", { id: noteId }]), note],
    [JSON.stringify(["kanban:listBoards", {}]), boards],
    [JSON.stringify(["kanban:listColumns", { boardId }]), columns],
    [JSON.stringify(["tags:listTags", {}]), tags],
  ]);
  const watch = vi.spyOn(client, "watchQuery").mockImplementation((query, ...[args]) => {
    const key = JSON.stringify([getFunctionName(query), args ?? {}]);
    if (!reads.has(key)) throw new Error(`Unexpected query: ${key}`);
    return {
      onUpdate: () => () => {},
      localQueryResult: () => reads.get(key),
      localQueryLogs: () => undefined,
      journal: () => undefined,
    };
  });
  const mutation = vi.spyOn(client, "mutation").mockImplementation(
    async (reference, ...[args]) =>
      owner.mutation(makeFunctionReference<"mutation">(getFunctionName(reference)), args ?? {}),
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

    const [boardPicker, columnPicker] = dialog.querySelectorAll("select");
    await act(async () => choose(boardPicker, boardId));
    expect(findButton(dialog, "Create task").disabled).toBe(true);
    await act(async () => choose(columnPicker, columns[1]._id));
    await act(async () => findButton(dialog, "Create task").click());

    const cards = await owner.query(api.kanban.listCards, { boardId });
    expect(cards).toMatchObject([{ title: action, sourceNoteId: noteId, columnId: columns[1]._id }]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector(".tiptap")).toBe(editor);
    expect(router.push).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Task created");
    await act(async () => findButton(container, "View task").click());
    expect(router.push).toHaveBeenCalledWith(`/kanban?board=${boardId}&card=${cards[0]._id}`);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    ranges.mockRestore();
    auth.mockRestore();
    clearAuth.mockRestore();
    watch.mockRestore();
    mutation.mockRestore();
    await client.close();
  }
});

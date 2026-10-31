// @vitest-environment jsdom
import { getFunctionName, makeFunctionReference } from "convex/server";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { afterEach, expect, it, vi } from "vitest";

import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ToastProvider } from "../components/ui/toast-notification";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function usePendingAuth() {
  return {
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

it("keeps the move dialog through optimistic reparenting, rollback, and retry", async () => {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const boardId = await owner.mutation(api.kanban.createBoard, {
    title: "Release",
  });
  const columns = await owner.query(api.kanban.listColumns, { boardId });
  const cardId = await owner.mutation(api.kanban.createCard, {
    boardId,
    columnId: columns[0]._id,
    title: "Move me",
  });
  const boards = await owner.query(api.kanban.listBoards, {});
  const board = boards.find((item) => item._id === boardId);
  if (!board) throw new Error("Missing test board");
  const testedBoard = board;
  const original = await owner.query(api.kanban.listCards, { boardId });
  const moved = original.map((card) => ({ ...card, columnId: columns[1]._id }));
  const client = new ConvexReactClient("https://move-dialog-test.convex.cloud");
  let reject: (cause: Error) => void = () => {};
  const mutation = vi
    .spyOn(client, "mutation")
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    )
    .mockImplementation(
      async (...[query, args]: Parameters<ConvexReactClient["mutation"]>) =>
        owner.mutation(makeFunctionReference<"mutation">(getFunctionName(query)), args ?? {}),
    );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  function render(cards: typeof original) {
    root.render(
      <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
        <ToastProvider>
          <KanbanBoard
            board={testedBoard}
            initialColumns={columns}
            initialCards={cards}
            tags={[]}
            onToggleSidebar={() => {}}
            sidebarOpen
          />
        </ToastProvider>
      </ConvexProviderWithAuth>,
    );
  }
  function dialog() {
    const element = document.querySelector('[role="dialog"]');
    if (!element) throw new Error("Move dialog is missing");
    return element;
  }
  function destination() {
    const button = [...dialog().querySelectorAll("button")].find((item) =>
      item.textContent?.includes(columns[1].title),
    );
    if (!button) throw new Error("Destination is missing");
    return button;
  }
  try {
    await act(async () => render(original));
    const moveButton = container.querySelector(
      'button[aria-label="Move Move me"]',
    );
    if (!(moveButton instanceof HTMLElement))
      throw new Error("Move action is missing");
    await act(async () => moveButton.click());
    const picker = dialog();
    await act(async () => destination().click());
    expect(destination().disabled).toBe(true);
    // Supply the same query change Convex publishes during an optimistic move.
    await act(async () => render(moved));
    expect(dialog()).toBe(picker);
    expect(
      container.querySelector(
        `section[aria-label="${columns[0].title} column"] article`,
      ),
    ).toBeNull();
    await act(async () => {
      render(original);
      reject(new Error("Move rejected"));
    });
    expect(dialog()).toBe(picker);
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain(
      "Move rejected",
    );
    expect(destination().disabled).toBe(false);
    await act(async () => destination().click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mutation).toHaveBeenCalledTimes(2);
    expect(
      (await owner.query(api.kanban.getCard, { id: cardId }))?.columnId,
    ).toBe(columns[1]._id);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    await client.close();
  }
});

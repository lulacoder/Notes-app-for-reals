// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { expect, it } from "vitest";

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ToastProvider } from "@/components/ui/toast-notification";
import { api } from "@/convex/_generated/api";

import { account, setup } from "./convex";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function usePendingAuth() {
  return {
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

it("opens the requested task as soon as its board loads and lets the reader dismiss it", async () => {
  const { client: owner } = await account(setup(), "user");
  const boardId = await owner.mutation(api.kanban.createBoard, { title: "Website redesign" });
  const [board, columns] = await Promise.all([
    owner.query(api.kanban.getBoard, { id: boardId }),
    owner.query(api.kanban.listColumns, { boardId }),
  ]);
  if (!board) throw new Error("Missing test board");
  const taskBoard = board;
  const cardId = await owner.mutation(api.kanban.createCard, {
    boardId,
    columnId: columns[1]._id,
    title: "Send the revised mockup",
  });
  const cards = await owner.query(api.kanban.listCards, { boardId });
  const client = new ConvexReactClient("https://task-link-test.convex.cloud");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  function LinkedBoard() {
    const [showTask, setShowTask] = useState(true);
    return (
      <KanbanBoard
        board={taskBoard}
        initialColumns={columns}
        initialCards={cards}
        linkedCard={showTask ? { id: cardId, dismiss: () => setShowTask(false) } : undefined}
        tags={[]}
        onToggleSidebar={() => {}}
        sidebarOpen
      />
    );
  }

  try {
    await act(async () => root.render(
      <ConvexProviderWithAuth client={client} useAuth={usePendingAuth}>
        <ToastProvider><LinkedBoard /></ToastProvider>
      </ConvexProviderWithAuth>,
    ));
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Task details");
    expect(dialog?.querySelector("input")?.value).toBe("Send the revised mockup");
    const close = dialog?.querySelector<HTMLButtonElement>('[aria-label="Close task details"]');
    expect(close).toBeDefined();
    await act(async () => close?.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    await client.close();
  }
});

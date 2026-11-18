import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

async function board() {
  const t = setup();
  const owner = (await account(t, "user")).client;
  const id = await owner.mutation(api.kanban.createBoard, { title: "Project" });
  const columns = await owner.query(api.kanban.listColumns, { boardId: id });
  const cardId = await owner.mutation(api.kanban.createCard, {
    boardId: id,
    columnId: columns[0]._id,
    title: "A task",
  });
  return { t, owner, id, columns, cardId };
}

describe("board editing and recovery", () => {
  it("keeps the original note link when editing a task and resolves the current note title", async () => {
    const { owner, id: boardId, columns } = await board();
    const noteId = await owner.mutation(api.notes.createNote, { title: "Client meeting notes" });
    const cardId = await owner.mutation(api.kanban.createCard, {
      boardId,
      columnId: columns[1]._id,
      title: "Send the client a revised mockup",
      sourceNoteId: noteId,
    });
    await owner.mutation(api.kanban.updateCard, { id: cardId, title: "Send the mockup" });
    await owner.mutation(api.notes.updateNote, { id: noteId, title: "Client project notes" });

    expect(await owner.query(api.kanban.getCard, { id: cardId })).toMatchObject({
      columnId: columns[1]._id,
      sourceNoteId: noteId,
      title: "Send the mockup",
    });
    expect(await owner.query(api.notes.getActiveNoteTitle, { id: noteId })).toBe("Client project notes");
    await owner.mutation(api.notes.softDeleteNote, { id: noteId });
    expect(await owner.query(api.notes.getActiveNoteTitle, { id: noteId })).toBeNull();
    await owner.mutation(api.notes.restoreNote, { id: noteId });
    expect(await owner.query(api.notes.getActiveNoteTitle, { id: noteId })).toBe("Client project notes");
  });

  it("rejects attaching inaccessible notes or adding a task to a deleted board", async () => {
    const { t, owner, id: boardId, columns } = await board();
    const other = (await account(t, "user")).client;
    const otherNoteId = await other.mutation(api.notes.createNote, { title: "Private note" });
    const ownNoteId = await owner.mutation(api.notes.createNote, { title: "Owner's note" });
    const destination = { boardId, columnId: columns[0]._id, title: "Follow up" };

    expect(await owner.query(api.notes.getActiveNoteTitle, { id: otherNoteId })).toBeNull();
    expect(await t.query(api.notes.getActiveNoteTitle, { id: ownNoteId })).toBeNull();
    await expect(owner.mutation(api.kanban.createCard, {
      ...destination, sourceNoteId: otherNoteId,
    })).rejects.toThrow("source note is no longer available");

    await owner.mutation(api.notes.softDeleteNote, { id: ownNoteId });
    await expect(owner.mutation(api.kanban.createCard, {
      ...destination, sourceNoteId: ownNoteId,
    })).rejects.toThrow("source note is no longer available");
    expect(await owner.query(api.kanban.listCards, { boardId })).toHaveLength(1);

    await owner.mutation(api.notes.restoreNote, { id: ownNoteId });
    await owner.mutation(api.kanban.softDeleteBoard, { id: boardId });
    await expect(owner.mutation(api.kanban.createCard, {
      ...destination, sourceNoteId: ownNoteId,
    })).rejects.toThrow("Board not found");
  });

  it("reorders all columns and rejects incomplete or duplicate lists", async () => {
    const { owner, id, columns } = await board();
    const orderedIds = columns.map((column) => column._id).reverse();
    await owner.mutation(api.kanban.reorderColumns, {
      boardId: id,
      orderedIds,
    });
    expect(
      (await owner.query(api.kanban.listColumns, { boardId: id })).map(
        (column) => column._id,
      ),
    ).toEqual(orderedIds);
    await expect(
      owner.mutation(api.kanban.reorderColumns, {
        boardId: id,
        orderedIds: orderedIds.slice(1),
      }),
    ).rejects.toThrow("exactly once");
    await expect(
      owner.mutation(api.kanban.reorderColumns, {
        boardId: id,
        orderedIds: columns.map(() => columns[0]._id),
      }),
    ).rejects.toThrow("exactly once");
  });
  it("distinguishes clearing a due date from leaving it unchanged", async () => {
    const { owner, cardId } = await board();
    await owner.mutation(api.kanban.updateCard, {
      id: cardId,
      dueDate: 1800000000000,
    });
    await owner.mutation(api.kanban.updateCard, {
      id: cardId,
      title: "Renamed",
    });
    expect(
      (await owner.query(api.kanban.getCard, { id: cardId }))?.dueDate,
    ).toBe(1800000000000);
    await owner.mutation(api.kanban.updateCard, { id: cardId, dueDate: null });
    expect(
      (await owner.query(api.kanban.getCard, { id: cardId }))?.dueDate,
    ).toBeUndefined();
  });

  it("refuses to destroy cards when a column has no destination", async () => {
    const { owner, columns, cardId } = await board();
    await expect(
      owner.mutation(api.kanban.deleteColumn, { id: columns[0]._id }),
    ).rejects.toThrow("Choose another column");
    expect(
      await owner.query(api.kanban.getCard, { id: cardId }),
    ).not.toBeNull();
    await owner.mutation(api.kanban.deleteColumn, {
      id: columns[0]._id,
      targetColumnId: columns[1]._id,
    });
    expect(
      (await owner.query(api.kanban.getCard, { id: cardId }))?.columnId,
    ).toBe(columns[1]._id);
  });

  it("restores deleted cards and isolates recovery by owner", async () => {
    const { t, owner, cardId } = await board();
    const other = (await account(t, "user")).client;
    await owner.mutation(api.kanban.softDeleteCard, { id: cardId });
    expect(await owner.query(api.kanban.listCardTrash, {})).toHaveLength(1);
    expect(await other.query(api.kanban.listCardTrash, {})).toEqual([]);
    await expect(
      other.mutation(api.kanban.restoreCard, { id: cardId }),
    ).rejects.toThrow("unauthorized");
    await owner.mutation(api.kanban.restoreCard, { id: cardId });
    expect(await owner.query(api.kanban.listCardTrash, {})).toEqual([]);
  });

  it("rejects a move or creation into a different board's column", async () => {
    const { owner, id, cardId } = await board();
    const second = await owner.mutation(api.kanban.createBoard, {
      title: "Other",
    });
    const [destination] = await owner.query(api.kanban.listColumns, {
      boardId: second,
    });
    await expect(
      owner.mutation(api.kanban.moveCard, {
        id: cardId,
        columnId: destination._id,
        order: 1000,
      }),
    ).rejects.toThrow("own board");
    await expect(
      owner.mutation(api.kanban.moveCardToColumnEnd, {
        id: cardId,
        columnId: destination._id,
      }),
    ).rejects.toThrow("own board");
    await expect(
      owner.mutation(api.kanban.createCard, {
        boardId: id,
        columnId: destination._id,
      }),
    ).rejects.toThrow("does not belong");
  });
});

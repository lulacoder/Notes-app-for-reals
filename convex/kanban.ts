import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── BOARDS ──────────────────────────────────────────────────────────────────

export const listBoards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const boards = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return boards
      .filter((b) => !b.isDeleted)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
  },
});

export const listBoardTrash = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const boards = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return boards
      .filter((b) => b.isDeleted)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },
});

export const getBoard = query({
  args: { id: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject) return null;
    return board;
  },
});

export const createBoard = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const boardId = await ctx.db.insert("kanbanBoards", {
      title: args.title || "Untitled Board",
      userId: identity.subject,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      isPinned: false,
    });

    // Seed default columns
    const defaultColumns = ["To Do", "In Progress", "Done"];
    for (let i = 0; i < defaultColumns.length; i++) {
      await ctx.db.insert("kanbanColumns", {
        boardId,
        title: defaultColumns[i],
        order: (i + 1) * 1000,
        userId: identity.subject,
        createdAt: now,
      });
    }

    return boardId;
  },
});

export const updateBoard = mutation({
  args: { id: v.id("kanbanBoards"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    await ctx.db.patch(args.id, { title: args.title, updatedAt: Date.now() });
    return args.id;
  },
});

export const softDeleteBoard = mutation({
  args: { id: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: now,
      isPinned: false,
    });

    return args.id;
  },
});

export const restoreBoard = mutation({
  args: { id: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    await ctx.db.patch(args.id, { isDeleted: false, deletedAt: undefined });
    return args.id;
  },
});

export const permanentDeleteBoard = mutation({
  args: { id: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    // Delete all cards for this board
    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete all columns
    const columns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();
    for (const col of columns) {
      await ctx.db.delete(col._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const togglePinBoard = mutation({
  args: { id: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    await ctx.db.patch(args.id, {
      isPinned: !board.isPinned,
      pinnedAt: !board.isPinned ? Date.now() : undefined,
    });
    return args.id;
  },
});

// ─── COLUMNS ─────────────────────────────────────────────────────────────────

export const listColumns = query({
  args: { boardId: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== identity.subject) return [];

    const columns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return columns.sort((a, b) => a.order - b.order);
  },
});

export const createColumn = mutation({
  args: { boardId: v.id("kanbanBoards"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    // Put new column at the end
    const existingColumns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    const maxOrder =
      existingColumns.length > 0
        ? Math.max(...existingColumns.map((c) => c.order))
        : 0;

    const now = Date.now();
    const columnId = await ctx.db.insert("kanbanColumns", {
      boardId: args.boardId,
      title: args.title,
      order: maxOrder + 1000,
      userId: identity.subject,
      createdAt: now,
    });

    await ctx.db.patch(args.boardId, { updatedAt: now });
    return columnId;
  },
});

export const updateColumn = mutation({
  args: { id: v.id("kanbanColumns"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const col = await ctx.db.get(args.id);
    if (!col || col.userId !== identity.subject)
      throw new Error("Column not found or unauthorized");

    await ctx.db.patch(args.id, { title: args.title });
    return args.id;
  },
});

export const deleteColumn = mutation({
  args: {
    id: v.id("kanbanColumns"),
    // If provided, cards in this column are moved to targetColumnId; otherwise deleted
    targetColumnId: v.optional(v.id("kanbanColumns")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const col = await ctx.db.get(args.id);
    if (!col || col.userId !== identity.subject)
      throw new Error("Column not found or unauthorized");

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column", (q) => q.eq("columnId", args.id))
      .collect();

    if (args.targetColumnId) {
      // Move cards to target column
      const targetCards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_column", (q) => q.eq("columnId", args.targetColumnId!))
        .collect();
      const maxOrder =
        targetCards.length > 0
          ? Math.max(...targetCards.map((c) => c.order))
          : 0;

      for (let i = 0; i < cards.length; i++) {
        await ctx.db.patch(cards[i]._id, {
          columnId: args.targetColumnId!,
          order: maxOrder + (i + 1) * 1000,
        });
      }
    } else {
      // Delete all cards
      for (const card of cards) {
        await ctx.db.delete(card._id);
      }
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const reorderColumns = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    orderedIds: v.array(v.id("kanbanColumns")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: (i + 1) * 1000 });
    }

    await ctx.db.patch(args.boardId, { updatedAt: Date.now() });
  },
});

// ─── CARDS ───────────────────────────────────────────────────────────────────

export const listCards = query({
  args: { boardId: v.id("kanbanBoards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== identity.subject) return [];

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return cards
      .filter((c) => !c.isDeleted)
      .sort((a, b) => a.order - b.order);
  },
});

export const getCard = query({
  args: { id: v.id("kanbanCards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== identity.subject) return null;
    return card;
  },
});

export const createCard = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    columnId: v.id("kanbanColumns"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== identity.subject)
      throw new Error("Board not found or unauthorized");

    // Place at the end of the column
    const existingCards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();
    const activeCards = existingCards.filter((c) => !c.isDeleted);
    const maxOrder =
      activeCards.length > 0
        ? Math.max(...activeCards.map((c) => c.order))
        : 0;

    const now = Date.now();
    const cardId = await ctx.db.insert("kanbanCards", {
      boardId: args.boardId,
      columnId: args.columnId,
      title: args.title || "New Card",
      order: maxOrder + 1000,
      userId: identity.subject,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    await ctx.db.patch(args.boardId, { updatedAt: now });
    return cardId;
  },
});

export const updateCard = mutation({
  args: {
    id: v.id("kanbanCards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== identity.subject)
      throw new Error("Card not found or unauthorized");

    const updates: {
      updatedAt: number;
      title?: string;
      description?: string;
      dueDate?: number;
      tagIds?: typeof args.tagIds;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;

    await ctx.db.patch(args.id, updates);
    await ctx.db.patch(card.boardId, { updatedAt: Date.now() });
    return args.id;
  },
});

export const moveCard = mutation({
  args: {
    id: v.id("kanbanCards"),
    columnId: v.id("kanbanColumns"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== identity.subject)
      throw new Error("Card not found or unauthorized");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      columnId: args.columnId,
      order: args.order,
      updatedAt: now,
    });
    await ctx.db.patch(card.boardId, { updatedAt: now });
    return args.id;
  },
});

export const reorderCards = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
    orderedIds: v.array(v.id("kanbanCards")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (let i = 0; i < args.orderedIds.length; i++) {
      const card = await ctx.db.get(args.orderedIds[i]);
      if (card && card.userId === identity.subject) {
        await ctx.db.patch(args.orderedIds[i], { order: (i + 1) * 1000 });
      }
    }
  },
});

export const softDeleteCard = mutation({
  args: { id: v.id("kanbanCards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== identity.subject)
      throw new Error("Card not found or unauthorized");

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });
    return args.id;
  },
});

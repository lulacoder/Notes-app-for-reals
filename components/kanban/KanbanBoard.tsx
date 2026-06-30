"use client";

import { useState, useEffect, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pin,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

type Board = {
  _id: Id<"kanbanBoards">;
  title: string;
  updatedAt: number;
  isPinned?: boolean;
};

interface KanbanBoardProps {
  board: Board;
  tags: Tag[];
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function KanbanBoard({
  board,
  tags,
  onToggleSidebar,
  sidebarOpen,
}: KanbanBoardProps) {
  const columns = useQuery(api.kanban.listColumns, { boardId: board._id }) ?? [];
  const cards = useQuery(api.kanban.listCards, { boardId: board._id }) ?? [];

  const moveCard = useMutation(api.kanban.moveCard);
  const reorderCards = useMutation(api.kanban.reorderCards);
  const reorderColumns = useMutation(api.kanban.reorderColumns);
  const createColumn = useMutation(api.kanban.createColumn);
  const updateBoard = useMutation(api.kanban.updateBoard);
  const softDeleteBoard = useMutation(api.kanban.softDeleteBoard);
  const togglePin = useMutation(api.kanban.togglePinBoard);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync board title when board changes
  useEffect(() => {
    setBoardTitle(board.title);
  }, [board.title]);

  const handleBoardTitleSave = async () => {
    if (boardTitle.trim() && boardTitle !== board.title) {
      await updateBoard({ id: board._id, title: boardTitle.trim() });
    } else {
      setBoardTitle(board.title);
    }
    setIsEditingTitle(false);
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) {
      setIsAddingColumn(false);
      return;
    }
    await createColumn({ boardId: board._id, title: newColumnTitle.trim() });
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      if (type === "COLUMN") {
        // Reorder columns
        const newColumnOrder = Array.from(columns.map((c) => c._id));
        const [removed] = newColumnOrder.splice(source.index, 1);
        newColumnOrder.splice(destination.index, 0, removed);
        await reorderColumns({
          boardId: board._id,
          orderedIds: newColumnOrder,
        });
        return;
      }

      // Move card
      const sourceColId = source.droppableId as Id<"kanbanColumns">;
      const destColId = destination.droppableId as Id<"kanbanColumns">;
      const cardId = draggableId as Id<"kanbanCards">;

      const destCards = cards
        .filter((c) => c.columnId === destColId)
        .sort((a, b) => a.order - b.order);

      // Calculate new order for the card
      let newOrder: number;
      if (destCards.length === 0) {
        newOrder = 1000;
      } else if (destination.index === 0) {
        newOrder = destCards[0].order / 2;
      } else if (destination.index >= destCards.length) {
        newOrder = destCards[destCards.length - 1].order + 1000;
      } else {
        const before = destCards[destination.index - 1];
        const after = destCards[destination.index];
        // Adjust if moving within same column
        const actualBefore =
          sourceColId === destColId && source.index < destination.index
            ? destCards[destination.index]
            : before;
        const actualAfter =
          sourceColId === destColId && source.index < destination.index
            ? destCards[destination.index + 1] ?? null
            : after;
        if (actualAfter) {
          newOrder = (actualBefore.order + actualAfter.order) / 2;
        } else {
          newOrder = actualBefore.order + 1000;
        }
      }

      await moveCard({ id: cardId, columnId: destColId, order: newOrder });
    },
    [board._id, cards, columns, moveCard, reorderColumns]
  );

  const cardsByColumn = columns.reduce<
    Record<string, typeof cards>
  >((acc, col) => {
    acc[col._id] = cards
      .filter((c) => c.columnId === col._id)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Board header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        {isEditingTitle ? (
          <Input
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            onBlur={handleBoardTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBoardTitleSave();
              if (e.key === "Escape") {
                setBoardTitle(board.title);
                setIsEditingTitle(false);
              }
            }}
            className="h-8 text-lg font-bold border-primary max-w-xs"
            autoFocus
          />
        ) : (
          <button
            className="text-lg font-bold hover:text-primary transition-colors truncate max-w-xs"
            onDoubleClick={() => setIsEditingTitle(true)}
            title="Double-click to rename"
          >
            {board.title}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename Board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => togglePin({ id: board._id })}>
                <Pin className="h-4 w-4 mr-2" />
                {board.isPinned ? "Unpin Board" : "Pin Board"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => softDeleteBoard({ id: board._id })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Columns area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className={cn(
            "flex-1 overflow-x-auto overflow-y-hidden",
            isMobile && "scroll-smooth"
          )}
          style={
            isMobile
              ? { scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }
              : undefined
          }
        >
          <div className="flex gap-4 p-4 h-full items-start min-w-max">
            {columns.map((column) => (
              <motion.div
                key={column._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                layout
              >
                <KanbanColumn
                  column={column}
                  allColumns={columns}
                  cards={cardsByColumn[column._id] ?? []}
                  boardId={board._id}
                  tags={tags}
                  isMobile={isMobile}
                />
              </motion.div>
            ))}

            {/* Add column button / form */}
            <div className="shrink-0 w-[300px]">
              {isAddingColumn ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-muted/40 border rounded-xl p-3 space-y-2"
                >
                  <Input
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") {
                        setIsAddingColumn(false);
                        setNewColumnTitle("");
                      }
                    }}
                    placeholder="Column title..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAddColumn}
                    >
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumnTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed text-muted-foreground hover:text-foreground h-10 gap-2"
                  onClick={() => setIsAddingColumn(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Column
                </Button>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

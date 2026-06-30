"use client";

import { useState, useRef } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Droppable } from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

type Card = {
  _id: Id<"kanbanCards">;
  title: string;
  description?: string;
  dueDate?: number;
  tagIds?: Id<"tags">[];
  columnId: Id<"kanbanColumns">;
  boardId: Id<"kanbanBoards">;
  order: number;
};

type Column = {
  _id: Id<"kanbanColumns">;
  title: string;
  order: number;
};

interface KanbanColumnProps {
  column: Column;
  allColumns: Column[];
  cards: Card[];
  boardId: Id<"kanbanBoards">;
  tags: Tag[];
  isMobile: boolean;
}

export function KanbanColumn({
  column,
  allColumns,
  cards,
  boardId,
  tags,
  isMobile,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  const updateColumn = useMutation(api.kanban.updateColumn);
  const deleteColumn = useMutation(api.kanban.deleteColumn);
  const createCard = useMutation(api.kanban.createCard);

  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== column.title) {
      await updateColumn({ id: column._id, title: titleValue.trim() });
    } else {
      setTitleValue(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleDeleteColumn = async () => {
    // Move cards to the next column if available
    const otherColumns = allColumns.filter((c) => c._id !== column._id);
    const targetColumnId = otherColumns[0]?._id;
    await deleteColumn({ id: column._id, targetColumnId });
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) {
      setIsAddingCard(false);
      return;
    }
    await createCard({
      boardId,
      columnId: column._id,
      title: newCardTitle.trim(),
    });
    setNewCardTitle("");
    setIsAddingCard(false);
  };

  const handleAddCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddCard();
    if (e.key === "Escape") {
      setNewCardTitle("");
      setIsAddingCard(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl bg-muted/40 border",
        "shrink-0",
        isMobile ? "w-[85vw] snap-start" : "w-[300px]"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitleValue(column.title);
                setIsEditingTitle(false);
              }
            }}
            className="h-7 text-sm font-semibold border-primary"
            autoFocus
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold truncate hover:text-primary transition-colors"
            onDoubleClick={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleInputRef.current?.select(), 50);
            }}
          >
            {column.title}
          </button>
        )}

        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 shrink-0">
          {cards.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setIsEditingTitle(true);
                setTimeout(() => titleInputRef.current?.select(), 50);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteColumn}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards droppable area */}
      <Droppable droppableId={column._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto px-3 py-1 space-y-2 min-h-[80px] max-h-[calc(100vh-280px)] transition-colors duration-200",
              snapshot.isDraggingOver && "bg-primary/5 rounded-xl"
            )}
          >
            <AnimatePresence>
              {cards.map((card, index) => (
                <motion.div
                  key={card._id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <KanbanCard
                    card={card}
                    index={index}
                    tags={tags}
                    columns={allColumns}
                    isMobile={isMobile}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add card area */}
      <div className="px-3 pb-3 pt-1">
        <AnimatePresence mode="wait">
          {isAddingCard ? (
            <motion.div
              key="adding"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Input
                ref={cardInputRef}
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleAddCardKeyDown}
                placeholder="Card title..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddCard}>
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5"
                onClick={() => setIsAddingCard(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add card
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

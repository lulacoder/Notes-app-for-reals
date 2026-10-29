"use client";

import { useRef, useState } from "react";

import {
  Droppable,
  type DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { useMutation } from "convex/react";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-notification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: Doc<"kanbanColumns">;
  allColumns: Doc<"kanbanColumns">[];
  cards: Doc<"kanbanCards">[];
  totalCards: number;
  boardId: Id<"kanbanBoards">;
  tags: Doc<"tags">[];
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  filtering: boolean;
  onMoveCard: (id: Id<"kanbanCards">) => void;
}

export function KanbanColumn({
  column,
  allColumns,
  cards,
  totalCards,
  boardId,
  tags,
  dragHandleProps,
  filtering,
  onMoveCard,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [adding, setAdding] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [destination, setDestination] = useState(
    allColumns.find((item) => item._id !== column._id)?._id ?? "",
  );
  const update = useMutation(api.kanban.updateColumn);
  const remove = useMutation(api.kanban.deleteColumn);
  const create = useMutation(api.kanban.createCard);
  const { error } = useToast();
  async function run(action: () => Promise<unknown>, done: () => void) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await action();
      done();
    } catch (cause) {
      console.error("Failed KanbanColumn action:", cause);
      error(
        "Could not update column",
        cause instanceof Error ? cause.message : "Try again.",
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  function saveTitle() {
    if (!title.trim()) {
      setTitle(column.title);
      setEditing(false);
      return;
    }
    void run(
      () => update({ id: column._id, title: title.trim() }),
      () => setEditing(false),
    );
  }
  const target = allColumns.find(
    (item) => item._id === destination && item._id !== column._id,
  );
  return (
    <section
      className="flex h-full max-h-full w-[min(85vw,300px)] flex-col rounded-xl border bg-muted/35"
      aria-label={`${column.title} column`}
    >
      <div className="flex items-center gap-1.5 p-3">
        <button
          {...dragHandleProps}
          aria-label={`Reorder ${column.title} column`}
          className="rounded p-1 text-muted-foreground"
        >
          <GripVertical size={15} />
        </button>
        {editing ? (
          <Input
            autoFocus
            aria-label="Column title"
            className="h-8 min-w-0 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle();
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
            onClick={() => {
              setTitle(column.title);
              setEditing(true);
            }}
            aria-label={`Rename ${column.title} column`}
          >
            {column.title}
          </button>
        )}
        <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {filtering ? `${cards.length}/` : ""}
          {totalCards}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Options for ${column.title} column`}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setTitle(column.title);
                setEditing(true);
              }}
            >
              <Pencil size={14} />
              Rename column
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={14} />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Droppable droppableId={column._id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[80px] flex-1 space-y-2 overflow-y-auto px-3 pb-2",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card._id}
                card={card}
                index={index}
                tags={tags}
                columns={allColumns}
                dragDisabled={filtering}
                onMoveCard={onMoveCard}
              />
            ))}
            {provided.placeholder}
            {cards.length === 0 && (
              <p className="rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">
                {filtering
                  ? "No matching tasks"
                  : "Drop a task here or add your next step."}
              </p>
            )}
          </div>
        )}
      </Droppable>
      <div className="p-3">
        {adding ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (cardTitle.trim())
                void run(
                  () =>
                    create({
                      boardId,
                      columnId: column._id,
                      title: cardTitle.trim(),
                    }),
                  () => {
                    setCardTitle("");
                    setAdding(false);
                  },
                );
            }}
          >
            <Input
              autoFocus
              aria-label={`New task in ${column.title}`}
              placeholder="What needs doing?"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={pending || !cardTitle.trim()}>
                {pending ? "Adding..." : "Add task"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
            Add task
          </Button>
        )}
      </div>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {column.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            {totalCards
              ? `Choose where to move the ${totalCards} tasks before deleting this column. No tasks will be permanently deleted.`
              : "This removes the column. Any remaining tasks must be moved to another column."}
          </AlertDialogDescription>
          {allColumns.length > 1 && (
            <label className="space-y-2 text-sm">
              Move remaining tasks to
              <select
                aria-label="Destination for column tasks"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {allColumns
                  .filter((item) => item._id !== column._id)
                  .map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {totalCards > 0 && !target && (
            <p role="status" className="text-sm text-destructive">
              Create another column to keep these tasks before deleting this
              one.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || (totalCards > 0 && !target)}
              onClick={(e) => {
                e.preventDefault();
                void run(
                  () => remove({ id: column._id, targetColumnId: target?._id }),
                  () => setDeleting(false),
                );
              }}
            >
              {pending ? "Deleting..." : "Delete column"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

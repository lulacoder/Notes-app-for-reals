"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveStatus } from "@/components/SaveStatus";
import { useToast } from "@/components/ui/toast-notification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { stripHtmlToText } from "@/lib/html-utils";

interface Props {
  board: Doc<"kanbanBoards">;
  tags: Doc<"tags">[];
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  initialColumns?: Doc<"kanbanColumns">[];
  initialCards?: Doc<"kanbanCards">[];
}

export function KanbanBoard({
  board,
  tags,
  onToggleSidebar,
  sidebarOpen,
  initialColumns,
  initialCards,
}: Props) {
  const { isAuthenticated } = useConvexAuth();
  const columns =
    useQuery(
      api.kanban.listColumns,
      isAuthenticated ? { boardId: board._id } : "skip",
    ) ?? initialColumns;
  const cards =
    useQuery(
      api.kanban.listCards,
      isAuthenticated ? { boardId: board._id } : "skip",
    ) ?? initialCards;
  const moveCard = useMutation(api.kanban.moveCard).withOptimisticUpdate(
    (store, args) => {
      const query = { boardId: board._id };
      const current = store.getQuery(api.kanban.listCards, query);
      if (current)
        store.setQuery(
          api.kanban.listCards,
          query,
          current.map((card) =>
            card._id === args.id
              ? { ...card, columnId: args.columnId, order: args.order }
              : card,
          ),
        );
    },
  );
  const reorder = useMutation(api.kanban.reorderColumns).withOptimisticUpdate(
    (store, args) => {
      const query = { boardId: board._id };
      const current = store.getQuery(api.kanban.listColumns, query);
      if (current)
        store.setQuery(
          api.kanban.listColumns,
          query,
          current
            .map((col) => ({
              ...col,
              order: (args.orderedIds.indexOf(col._id) + 1) * 1000,
            }))
            .sort((a, b) => a.order - b.order),
        );
    },
  );
  const createColumn = useMutation(api.kanban.createColumn);
  const updateBoard = useMutation(api.kanban.updateBoard);
  const removeBoard = useMutation(api.kanban.softDeleteBoard);
  const pin = useMutation(api.kanban.togglePinBoard);
  const [title, setTitle] = useState(board.title);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [due, setDue] = useState("all");
  const [columnTitle, setColumnTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryRef = useRef<(() => Promise<unknown>) | null>(null);
  const { error, success } = useToast();
  async function run(action: () => Promise<unknown>) {
    setPending((value) => value + 1);
    setFailed(false);
    try {
      await action();
      return true;
    } catch (cause) {
      retryRef.current = action;
      setFailed(true);
      error(
        "Could not save board",
        cause instanceof Error ? cause.message : "Try again.",
      );
      return false;
    } finally {
      setPending((value) => value - 1);
    }
  }
  const filtering = !!query.trim() || !!tag || due !== "all";
  const grouped = new Map(
    (columns ?? []).map((col) => [col._id, Array<Doc<"kanbanCards">>()]),
  );
  for (const card of cards ?? []) grouped.get(card.columnId)?.push(card);
  for (const group of grouped.values()) group.sort((a, b) => a.order - b.order);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = today.getTime() + 86400000;
  function visible(card: Doc<"kanbanCards">) {
    return (
      (!query.trim() ||
        `${card.title} ${stripHtmlToText(card.description ?? "")}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())) &&
      (!tag || card.tagIds?.some((id) => id === tag)) &&
      (due === "all" ||
        (card.dueDate !== undefined &&
          (due === "overdue"
            ? card.dueDate < today.getTime()
            : due === "today"
              ? card.dueDate >= today.getTime() && card.dueDate < tomorrow
              : card.dueDate >= tomorrow)))
    );
  }
  function drag(result: DropResult) {
    const { destination, source, type, draggableId } = result;
    if (
      !destination ||
      !columns ||
      !cards ||
      (destination.index === source.index &&
        destination.droppableId === source.droppableId)
    )
      return;
    if (type === "COLUMN") {
      const ids = columns.map((col) => col._id);
      const [moved] = ids.splice(source.index, 1);
      if (!moved) return;
      ids.splice(destination.index, 0, moved);
      void run(() => reorder({ boardId: board._id, orderedIds: ids }));
      return;
    }
    if (filtering) return;
    const card = cards.find((item) => item._id === draggableId);
    const column = columns.find((item) => item._id === destination.droppableId);
    if (!card || !column) return;
    const others = (grouped.get(column._id) ?? []).filter(
      (item) => item._id !== card._id,
    );
    const before = others[destination.index - 1];
    const after = others[destination.index];
    const order =
      before && after
        ? (before.order + after.order) / 2
        : before
          ? before.order + 1000
          : after
            ? after.order / 2
            : 1000;
    void run(() => moveCard({ id: card._id, columnId: column._id, order }));
  }
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <header className="space-y-3 border-b bg-background px-3 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link href="/notes">
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to notes</span>
              <span className="sm:hidden">Notes</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Choose boards"
            aria-expanded={sidebarOpen}
            onClick={onToggleSidebar}
          >
            <PanelLeft size={16} />
          </Button>
          {editing ? (
            <Input
              aria-label="Board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-8 max-w-[260px]"
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
                if (e.key === "Enter") {
                  setEditing(false);
                  if (title.trim())
                    void run(() =>
                      updateBoard({ id: board._id, title: title.trim() }),
                    );
                }
              }}
              onBlur={() => {
                setEditing(false);
                if (title.trim() && title.trim() !== board.title)
                  void run(() =>
                    updateBoard({ id: board._id, title: title.trim() }),
                  );
              }}
            />
          ) : (
            <button
              className="min-w-0 max-w-[220px] truncate text-left text-lg font-semibold tracking-tight"
              aria-label="Rename board"
              onClick={() => {
                setTitle(board.title);
                setEditing(true);
              }}
            >
              {board.title}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SaveStatus
              status={failed ? "error" : pending ? "saving" : "saved"}
              retry={() => {
                if (retryRef.current) void run(retryRef.current);
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Board options"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setTitle(board.title);
                    setEditing(true);
                  }}
                >
                  <Pencil size={14} />
                  Rename board
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void run(() => pin({ id: board._id }))}
                >
                  <Pin size={14} />
                  {board.isPinned ? "Unpin board" : "Pin board"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    void run(async () => {
                      await removeBoard({ id: board._id });
                      success("Board moved to recently deleted");
                    })
                  }
                >
                  <Trash2 size={14} />
                  Delete board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[140px] flex-1 sm:max-w-[300px]">
            <Search
              size={14}
              className="absolute left-2.5 top-2.5 text-muted-foreground"
            />
            <Input
              aria-label="Search tasks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a task..."
              className="h-9 pl-8 text-xs"
            />
          </label>
          <select
            aria-label="Filter tasks by tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-9 max-w-[160px] rounded-md border bg-background px-2 text-xs"
          >
            <option value="">All tags</option>
            {tags.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tasks by due date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">
            {cards?.filter(visible).length ?? 0} tasks
          </span>
        </div>
        {filtering && (
          <p className="text-xs text-muted-foreground">
            Move tasks using their Move button while filtering.{" "}
            <button
              className="text-primary underline"
              onClick={() => {
                setQuery("");
                setTag("");
                setDue("all");
              }}
            >
              Clear filters to drag
            </button>
          </p>
        )}
      </header>
      {!columns || !cards ? (
        <div role="status" className="p-8 text-sm text-muted-foreground">
          Loading your board...
        </div>
      ) : (
        <DragDropContext onDragEnd={drag}>
          <Droppable
            droppableId="board-columns"
            direction="horizontal"
            type="COLUMN"
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-1 items-start gap-4 overflow-x-auto overflow-y-hidden bg-muted/15 p-4 sm:p-5"
              >
                {columns.map((column, index) => (
                  <Draggable
                    disableInteractiveElementBlocking
                    key={column._id}
                    draggableId={column._id}
                    index={index}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className="h-full shrink-0"
                      >
                        <KanbanColumn
                          column={column}
                          allColumns={columns}
                          cards={(grouped.get(column._id) ?? []).filter(
                            visible,
                          )}
                          totalCards={(grouped.get(column._id) ?? []).length}
                          boardId={board._id}
                          tags={tags}
                          dragHandleProps={dragProvided.dragHandleProps}
                          filtering={filtering}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="w-[280px] shrink-0">
                  {adding ? (
                    <form
                      className="space-y-3 rounded-xl border bg-card p-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          columnTitle.trim() &&
                          (await run(() =>
                            createColumn({
                              boardId: board._id,
                              title: columnTitle.trim(),
                            }),
                          ))
                        ) {
                          setColumnTitle("");
                          setAdding(false);
                        }
                      }}
                    >
                      <Input
                        aria-label="New column title"
                        value={columnTitle}
                        onChange={(e) => setColumnTitle(e.target.value)}
                        placeholder="Column title"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={pending > 0}>
                          Add column
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setAdding(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start border-dashed text-muted-foreground"
                      onClick={() => setAdding(true)}
                    >
                      <Plus size={15} />
                      Add column
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

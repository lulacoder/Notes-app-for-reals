"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Calendar,
  Check,
  FileText,
  Loader2,
  MoveRight,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-notification";
import { KanbanDropdown } from "./KanbanDropdown";
import styles from "./Kanban.module.css";

const MAX_TASK_TITLE_LENGTH = 300;

type KanbanCardModalProps = (
  | {
      card: Doc<"kanbanCards">;
      columns: Doc<"kanbanColumns">[];
      boardId?: never;
      columnId?: never;
      sourceNote?: never;
      onCreated?: never;
    }
  | {
      card?: never;
      columns: Doc<"kanbanColumns">[];
      boardId: Id<"kanbanBoards">;
      columnId: Id<"kanbanColumns">;
      sourceNote?: never;
      onCreated?: never;
    }
  | {
      card?: never;
      columns?: never;
      boardId?: never;
      columnId?: never;
      sourceNote: { id: Id<"notes">; title: string; selection: string };
      onCreated: (boardId: Id<"kanbanBoards">, cardId: Id<"kanbanCards">) => void;
    }
) & {
  tags: Doc<"tags">[];
  open: boolean;
  onClose: () => void;
  onCloseAutoFocus?: () => void;
};

export function KanbanCardModal({
  card,
  boardId,
  columnId,
  columns: boardColumns,
  sourceNote,
  tags,
  open,
  onClose,
  onCloseAutoFocus,
  onCreated,
}: KanbanCardModalProps) {
  const id = useId();
  const [initial, setInitial] = useState(() => ({
    title: card?.title ?? sourceNote?.selection.replace(/\s+/g, " ").trim()
      .slice(0, MAX_TASK_TITLE_LENGTH).trimEnd() ?? "",
    description: card?.description ?? "",
    date: card?.dueDate === undefined ? "" : format(card.dueDate, "yyyy-MM-dd"),
    tagIds: card?.tagIds ?? [],
  }));
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [tagIds, setTagIds] = useState(initial.tagIds);
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"kanbanBoards">>();
  const [selectedColumn, setSelectedColumn] = useState(columnId);
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState("");
  const [discarding, setDiscarding] = useState<"close" | "source" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const draft = { title, description, date, tagIds };
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const { isAuthenticated } = useConvexAuth();
  const boards = useQuery(
    api.kanban.listBoards,
    open && sourceNote && isAuthenticated ? {} : "skip",
  );
  const selectedBoard = boards?.find((board) => board._id === selectedBoardId);
  const noteTaskColumns = useQuery(
    api.kanban.listColumns,
    selectedBoard ? { boardId: selectedBoard._id } : "skip",
  );
  const columns = boardColumns ?? noteTaskColumns ?? [];
  const destinationBoardId = boardId ?? selectedBoard?._id;
  const destinationColumnId = columns.find((column) => column._id === selectedColumn)?._id;
  const boardPlaceholder = boards === undefined
    ? "Loading boards..."
    : boards.length === 0 ? "Create a board first" : "Choose a board";
  let columnPlaceholder = "Choose a column";
  if (sourceNote) {
    if (!selectedBoard) columnPlaceholder = "Choose a board first";
    else if (noteTaskColumns === undefined) columnPlaceholder = "Loading columns...";
    else if (columns.length === 0) columnPlaceholder = "No columns on this board";
  }
  const linkedNoteTitle = useQuery(
    api.notes.getActiveNoteTitle,
    open && card?.sourceNoteId && isAuthenticated ? { id: card.sourceNoteId } : "skip",
  );
  const linkedNoteHref = card?.sourceNoteId && linkedNoteTitle != null
    ? `/notes/${card.sourceNoteId}` : null;
  const create = useMutation(api.kanban.createCard);
  const update = useMutation(api.kanban.updateCard);
  const move = useMutation(api.kanban.moveCardToColumnEnd);
  const remove = useMutation(api.kanban.softDeleteCard);
  const { success } = useToast();
  function close() {
    if (running.current || deleting || discarding) return;
    if (dirty) setDiscarding("close");
    else onClose();
  }
  async function save() {
    if (!card) {
      if (!destinationBoardId || !destinationColumnId) {
        throw new Error("Choose a board and column.");
      }
      const cardId = await create({
        boardId: destinationBoardId,
        columnId: destinationColumnId,
        title: title.trim(),
        description,
        dueDate: date ? new Date(`${date}T00:00:00`).getTime() : undefined,
        tagIds,
        sourceNoteId: sourceNote?.id,
      });
      onCreated?.(destinationBoardId, cardId);
    } else if (dirty) {
      await update({
        id: card._id,
        title: title.trim() || "Untitled",
        description,
        dueDate: date ? new Date(`${date}T00:00:00`).getTime() : null,
        tagIds,
      });
      setInitial(draft);
    }
  }
  async function action(run: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setMessage("");
    try {
      await run();
      onClose();
    } catch (cause) {
      console.error("Failed KanbanCardModal action:", cause);
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Could not save. Please try again.",
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  function chooseColumn(value: string) {
    const destination = columns.find((column) => column._id === value);
    if (!destination) return;
    if (!card) {
      setSelectedColumn(destination._id);
      return;
    }
    void action(async () => {
      await save();
      await move({ id: card._id, columnId: destination._id });
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[calc(100dvh-32px)] w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0",
            sourceNote && "sm:max-w-2xl",
            styles.surface,
          )}
          showCloseButton={false}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            close();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            close();
          }}
          onCloseAutoFocus={(event) => {
            if (onCloseAutoFocus) {
              event.preventDefault();
              onCloseAutoFocus();
            }
          }}
        >
          <header className={cn("border-b p-5 sm:p-6", sourceNote && "sm:px-8")}>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                {card ? "Task details" : sourceNote ? "Create task" : "Add task"}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Close task details"
                disabled={pending}
                onClick={close}
              >
                <X size={16} />
              </Button>
            </div>
            <DialogDescription className="mt-1 text-xs">
              {sourceNote
                ? "Choose where to add the task from this note."
                : "Keep the details here, then give the task its next step."}
            </DialogDescription>
          </header>
          <form
            className={cn("space-y-5 p-5 sm:p-6", sourceNote && "space-y-6 sm:p-8")}
            onSubmit={(e) => {
              e.preventDefault();
              void action(save);
            }}
            aria-busy={pending}
          >
            {message && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {message} Your changes are still here. Try saving again.
              </p>
            )}
            <fieldset
              disabled={pending}
              className={sourceNote ? "grid min-w-0 gap-5 sm:grid-cols-2 sm:gap-6" : "space-y-5"}
            >
              <label
                className="block space-y-2 text-sm font-medium sm:col-span-2"
                htmlFor={`${id}-title`}
              >
                Task title
                <Input
                  id={`${id}-title`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={MAX_TASK_TITLE_LENGTH}
                  autoFocus
                  className="mt-2 text-base font-semibold"
                />
              </label>
              {sourceNote && (
                <div className="grid min-w-0 gap-2.5 text-sm font-medium">
                  <span>Board</span>
                  <KanbanDropdown
                    variant="field"
                    label="Board"
                    value={selectedBoard?._id ?? ""}
                    options={boards?.map((board) => ({ value: board._id, label: board.title })) ?? []}
                    placeholder={boardPlaceholder}
                    onChange={(value) => {
                      const board = boards?.find((item) => item._id === value);
                      setSelectedBoardId(board?._id);
                      setSelectedColumn(undefined);
                    }}
                  />
                </div>
              )}
              {!sourceNote && (
                <label className="block text-sm font-medium" htmlFor={`${id}-description`}>
                  Description
                  <textarea
                    id={`${id}-description`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context, a useful link, or a few next steps..."
                    className="mt-2 min-h-[160px] w-full resize-y rounded-lg border bg-muted/20 p-3 text-sm font-normal leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              )}
              <div className={sourceNote ? "min-w-0" : "flex flex-wrap items-end gap-3"}>
                {!sourceNote && (
                  <label className="space-y-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Calendar size={14} />
                      Due date
                    </span>
                    <input
                      type="date"
                      aria-label="Task due date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 rounded-lg border bg-background px-3 text-sm"
                    />
                  </label>
                )}
                {!sourceNote && date && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDate("")}
                  >
                    Clear due date
                  </Button>
                )}
                <div className={cn("grid min-w-0 gap-2.5 text-sm", !sourceNote && "min-w-44 max-w-full")}>
                  <span className="flex items-center gap-2 font-medium">
                    {!sourceNote && <MoveRight size={14} />}
                    Column
                  </span>
                  <KanbanDropdown
                    variant="field"
                    label={sourceNote ? "Column" : "Move task to column"}
                    value={card?.columnId ?? destinationColumnId ?? ""}
                    options={columns.map((column) => ({ value: column._id, label: column.title }))}
                    placeholder={columnPlaceholder}
                    onChange={chooseColumn}
                  />
                </div>
              </div>
              {(sourceNote || card?.sourceNoteId) && (
                <div className="space-y-1 text-sm sm:col-span-2">
                  <p className="flex items-center gap-2 font-medium"><FileText size={14} /> Source note</p>
                  {sourceNote ? (
                    <p className="break-words text-muted-foreground">{sourceNote.title || "Untitled note"}</p>
                  ) : linkedNoteHref ? (
                    <Link
                      href={linkedNoteHref}
                      className="break-words text-primary underline-offset-4 hover:underline"
                      onNavigate={(event) => {
                        if (running.current || dirty) {
                          event.preventDefault();
                          if (!running.current) setDiscarding("source");
                        }
                      }}
                    >
                      {linkedNoteTitle || "Untitled note"}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">
                      {linkedNoteTitle === undefined ? "Loading note..." : "This note is unavailable."}
                    </p>
                  )}
                </div>
              )}
              {!sourceNote && <div>
                <span className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Tag size={14} />
                  Tags
                </span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag._id}
                      type="button"
                      aria-pressed={tagIds.includes(tag._id)}
                      onClick={() =>
                        setTagIds((ids) =>
                          ids.includes(tag._id)
                            ? ids.filter((item) => item !== tag._id)
                            : [...ids, tag._id],
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                        tagIds.includes(tag._id) &&
                          "border-primary bg-primary/5 text-primary",
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", tag.color)} />
                      {tag.name}
                      {tagIds.includes(tag._id) && <Check size={11} />}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Create tags in your notes workspace to use them here.
                    </p>
                  )}
                </div>
              </div>}
            </fieldset>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              {card ? <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={14} />
                Delete task
              </Button> : <span />}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={close}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button size="sm" disabled={pending || !title.trim() || (!card && (!destinationBoardId || !destinationColumnId))}>
                  {pending && <Loader2 size={13} className="animate-spin" />}
                  {pending ? "Saving..." : card ? "Save changes" : sourceNote ? "Create task" : "Add task"}
                </Button>
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discarding !== null} onOpenChange={(open) => { if (!open) setDiscarding(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits to this task have not been saved.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            {discarding === "source" ? (
              linkedNoteHref && (
                <AlertDialogAction asChild>
                  <Link href={linkedNoteHref}>Discard and open note</Link>
                </AlertDialogAction>
              )
            ) : (
              <AlertDialogAction onClick={onClose}>Discard changes</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogTitle>
            Move this task to recently deleted?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You can restore the saved task later from Recently deleted. Unsaved
            edits will be discarded.
          </AlertDialogDescription>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void action(async () => {
                  if (!card) return;
                  await remove({ id: card._id });
                  success("Task moved to recently deleted");
                });
              }}
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

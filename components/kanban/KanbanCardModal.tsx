"use client";

import { useId, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
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
import {
  Calendar,
  Check,
  Loader2,
  MoveRight,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast-notification";

interface Props {
  card: Doc<"kanbanCards">;
  columns: Doc<"kanbanColumns">[];
  tags: Doc<"tags">[];
  open: boolean;
  onClose: () => void;
}

export function KanbanCardModal({ card, columns, tags, open, onClose }: Props) {
  const id = useId();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [date, setDate] = useState(
    card.dueDate === undefined ? "" : format(card.dueDate, "yyyy-MM-dd"),
  );
  const [tagIds, setTagIds] = useState(card.tagIds ?? []);
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initial, setInitial] = useState(() =>
    JSON.stringify({
      title: card.title,
      description: card.description ?? "",
      date:
        card.dueDate === undefined ? "" : format(card.dueDate, "yyyy-MM-dd"),
      tagIds: card.tagIds ?? [],
    }),
  );
  const dirty =
    initial !== JSON.stringify({ title, description, date, tagIds });
  const update = useMutation(api.kanban.updateCard);
  const move = useMutation(api.kanban.moveCardToColumnEnd);
  const remove = useMutation(api.kanban.softDeleteCard);
  const { success } = useToast();
  function close() {
    if (running.current || deleting || discarding) return;
    if (dirty) setDiscarding(true);
    else onClose();
  }
  async function save() {
    if (dirty) {
      await update({
        id: card._id,
        title: title.trim() || "Untitled",
        description,
        dueDate: date ? new Date(`${date}T00:00:00`).getTime() : null,
        tagIds,
      });
      setInitial(JSON.stringify({ title, description, date, tagIds }));
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
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-32px)] max-w-xl gap-0 overflow-y-auto p-0"
          showCloseButton={false}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            close();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <header className="border-b p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                Task details
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
              Keep the details here, then give the task its next step.
            </DialogDescription>
          </header>
          <form
            className="space-y-5 p-5 sm:p-6"
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
            <fieldset disabled={pending} className="space-y-5">
              <label
                className="block space-y-2 text-sm font-medium"
                htmlFor={`${id}-title`}
              >
                Task title
                <Input
                  id={`${id}-title`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={300}
                  autoFocus
                  className="mt-2 text-base font-semibold"
                />
              </label>
              <label
                className="block text-sm font-medium"
                htmlFor={`${id}-description`}
              >
                Description
                <textarea
                  id={`${id}-description`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, a useful link, or a few next steps..."
                  className="mt-2 min-h-[160px] w-full resize-y rounded-lg border bg-muted/20 p-3 text-sm font-normal leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="flex flex-wrap items-end gap-3">
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
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </label>
                {date && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDate("")}
                  >
                    Clear due date
                  </Button>
                )}
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <MoveRight size={14} />
                    Column
                  </span>
                  <select
                    aria-label="Move task to column"
                    value={card.columnId}
                    onChange={(e) => {
                      const destination = columns.find(
                        (col) => col._id === e.target.value,
                      );
                      if (destination)
                        void action(async () => {
                          await save();
                          await move({
                            id: card._id,
                            columnId: destination._id,
                          });
                        });
                    }}
                    className="h-10 rounded-md border bg-background px-3"
                  >
                    {columns.map((col) => (
                      <option key={col._id} value={col._id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
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
              </div>
            </fieldset>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={14} />
                Delete task
              </Button>
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
                <Button size="sm" disabled={pending || !title.trim()}>
                  {pending && <Loader2 size={13} className="animate-spin" />}
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discarding} onOpenChange={setDiscarding}>
        <AlertDialogContent>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits to this task have not been saved.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>
              Discard changes
            </AlertDialogAction>
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

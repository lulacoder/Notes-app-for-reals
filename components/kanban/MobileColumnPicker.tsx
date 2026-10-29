"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-notification";
import { Check, MoveRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  columns: Doc<"kanbanColumns">[];
  currentColumnId: Id<"kanbanColumns">;
  cardId: Id<"kanbanCards">;
  boardId: Id<"kanbanBoards">;
}

export function MobileColumnPicker({
  open,
  onClose,
  columns,
  currentColumnId,
  cardId,
  boardId,
}: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { error } = useToast();
  const move = useMutation(api.kanban.moveCardToColumnEnd).withOptimisticUpdate(
    (store, args) => {
      const query = { boardId };
      const cards = store.getQuery(api.kanban.listCards, query);
      if (!cards) return;
      const order =
        Math.max(
          0,
          ...cards
            .filter((card) => card.columnId === args.columnId)
            .map((card) => card.order),
        ) + 1000;
      store.setQuery(
        api.kanban.listCards,
        query,
        cards.map((card) =>
          card._id === cardId
            ? { ...card, columnId: args.columnId, order }
            : card,
        ),
      );
    },
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2">
          <MoveRight size={18} />
          Move task
        </DialogTitle>
        <DialogDescription>
          Choose a column. The task will be placed at the end.
        </DialogDescription>
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <div className="space-y-2">
          {columns.map((column) => (
            <Button
              key={column._id}
              variant={column._id === currentColumnId ? "secondary" : "outline"}
              className="w-full justify-between"
              disabled={pending || column._id === currentColumnId}
              onClick={async () => {
                setPending(true);
                setMessage("");
                try {
                  await move({ id: cardId, columnId: column._id });
                  onClose();
                } catch (cause) {
                  const text =
                    cause instanceof Error ? cause.message : "Try again.";
                  setMessage(text);
                  error("Could not move task", text);
                } finally {
                  setPending(false);
                }
              }}
            >
              {column.title}
              {column._id === currentColumnId && <Check size={14} />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

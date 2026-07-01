"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Calendar,
  Tag,
  ChevronDown,
  X,
  MoveRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

type Column = {
  _id: Id<"kanbanColumns">;
  title: string;
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

interface KanbanCardModalProps {
  card: Card | null;
  columns: Column[];
  tags: Tag[];
  open: boolean;
  onClose: () => void;
}

export function KanbanCardModal({
  card,
  columns,
  tags,
  open,
  onClose,
}: KanbanCardModalProps) {
  const updateCard = useMutation(api.kanban.updateCard);
  const moveCardToColumnEnd = useMutation(api.kanban.moveCardToColumnEnd);
  const softDeleteCard = useMutation(api.kanban.softDeleteCard);

  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [dueDate, setDueDate] = useState<string>(
    card?.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<Id<"tags">[]>(
    card?.tagIds ?? []
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setDueDate(
        card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : ""
      );
      setSelectedTagIds(card.tagIds ?? []);
    }
  }, [card]);

  const handleSave = useCallback(async () => {
    if (!card) return;
    setIsSaving(true);
    try {
      await updateCard({
        id: card._id,
        title: title.trim() || "Untitled",
        description,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        tagIds: selectedTagIds,
      });
    } finally {
      setIsSaving(false);
    }
  }, [card, title, description, dueDate, selectedTagIds, updateCard]);

  const handleMoveToColumn = async (columnId: Id<"kanbanColumns">) => {
    if (!card) return;
    // Use moveCardToColumnEnd so the card is placed after all existing cards
    // in the destination column, not at its old source-column position.
    await moveCardToColumnEnd({ id: card._id, columnId });
    onClose();
  };

  const handleDelete = async () => {
    if (!card) return;
    await softDeleteCard({ id: card._id });
    onClose();
  };

  const toggleTag = (tagId: Id<"tags">) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const currentColumn = columns.find((c) => c._id === card?.columnId);
  const cardTags = tags.filter((t) => selectedTagIds.includes(t._id));

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogHeader>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto text-foreground"
              placeholder="Card title..."
            />
          </DialogHeader>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Column / Move */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <MoveRight className="h-3.5 w-3.5" />
                  {currentColumn?.title ?? "Unknown Column"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {columns.map((col) => (
                  <DropdownMenuItem
                    key={col._id}
                    onClick={() => handleMoveToColumn(col._id)}
                    className={cn(
                      col._id === card.columnId && "bg-muted font-medium"
                    )}
                  >
                    {col.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Due date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs bg-transparent border border-input rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
              />
              {dueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setDueDate("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Tags */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                  {selectedTagIds.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {selectedTagIds.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    No tags yet
                  </p>
                ) : (
                  tags.map((tag) => (
                    <DropdownMenuItem
                      key={tag._id}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleTag(tag._id);
                      }}
                      className="gap-2"
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          tag.color
                        )}
                      />
                      <span className="flex-1 text-xs">{tag.name}</span>
                      {selectedTagIds.includes(tag._id) && (
                        <span className="text-primary text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tag badges */}
          {cardTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cardTags.map((tag) => (
                <span
                  key={tag._id}
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-white",
                    tag.color
                  )}
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTag(tag._id)}
                    className="hover:opacity-70"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Description
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full min-h-[180px] text-sm bg-muted/30 rounded-lg p-3 outline-none focus:ring-1 focus:ring-ring resize-none border border-transparent focus:border-input transition-colors"
          />
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

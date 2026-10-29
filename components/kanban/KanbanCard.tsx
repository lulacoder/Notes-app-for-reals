"use client";

import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Draggable } from "@hello-pangea/dnd";
import { KanbanCardModal } from "./KanbanCardModal";
import { MobileColumnPicker } from "./MobileColumnPicker";
import { ArrowRightLeft, Calendar, GripVertical } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { stripHtmlToText } from "@/lib/html-utils";

interface Props {
  card: Doc<"kanbanCards">;
  index: number;
  tags: Doc<"tags">[];
  columns: Doc<"kanbanColumns">[];
  dragDisabled: boolean;
}

export function KanbanCard({
  card,
  index,
  tags,
  columns,
  dragDisabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const cardTags = tags.filter((tag) => card.tagIds?.includes(tag._id));
  return (
    <>
      <Draggable
        disableInteractiveElementBlocking
        draggableId={card._id}
        index={index}
        isDragDisabled={dragDisabled}
      >
        {(provided, snapshot) => (
          <article
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "group rounded-lg border bg-card shadow-sm transition-[box-shadow,border-color] hover:border-primary/30 hover:shadow-md",
              snapshot.isDragging && "ring-2 ring-primary/25 shadow-lg",
            )}
          >
            <button
              className="block w-full rounded-t-lg p-3 text-left"
              onClick={() => setOpen(true)}
              aria-label={`Open task: ${card.title}`}
            >
              {cardTags.length > 0 && (
                <span className="mb-2 flex flex-wrap gap-1">
                  {cardTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag._id}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium text-white",
                        tag.color,
                      )}
                    >
                      {tag.name}
                    </span>
                  ))}
                </span>
              )}
              <span className="block text-sm font-medium leading-snug">
                {card.title}
              </span>
              {card.description && (
                <span className="mt-1.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {stripHtmlToText(card.description)}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 px-3 pb-2.5">
              {card.dueDate !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
                    isBefore(card.dueDate, startOfDay(new Date()))
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Calendar size={11} />
                  {format(card.dueDate, "MMM d")}
                </span>
              )}
              <button
                {...provided.dragHandleProps}
                disabled={dragDisabled}
                className="ml-auto rounded p-1 text-muted-foreground disabled:opacity-30"
                aria-label={`Drag ${card.title}`}
              >
                <GripVertical size={13} />
              </button>
              <button
                onClick={() => setMoving(true)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Move ${card.title}`}
              >
                <ArrowRightLeft size={12} />
                Move
              </button>
            </div>
          </article>
        )}
      </Draggable>
      {open && (
        <KanbanCardModal
          key={card._id}
          card={card}
          columns={columns}
          tags={tags}
          open
          onClose={() => setOpen(false)}
        />
      )}
      <MobileColumnPicker
        open={moving}
        onClose={() => setMoving(false)}
        columns={columns}
        currentColumnId={card.columnId}
        cardId={card._id}
        boardId={card.boardId}
      />
    </>
  );
}

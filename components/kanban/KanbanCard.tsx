"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Draggable } from "@hello-pangea/dnd";
import { KanbanCardModal } from "./KanbanCardModal";
import { MobileColumnPicker } from "./MobileColumnPicker";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

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

interface KanbanCardProps {
  card: Card;
  index: number;
  tags: Tag[];
  columns: Column[];
  isMobile: boolean;
}

export function KanbanCard({
  card,
  index,
  tags,
  columns,
  isMobile,
}: KanbanCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);

  const cardTags = tags.filter((t) => card.tagIds?.includes(t._id));

  const dueDateOverdue =
    card.dueDate && isPast(new Date(card.dueDate)) && !isToday(new Date(card.dueDate));
  const dueDateToday = card.dueDate && isToday(new Date(card.dueDate));

  return (
    <>
      <Draggable draggableId={card._id} index={index} isDragDisabled={isMobile}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group bg-card border rounded-xl p-3 cursor-pointer transition-all duration-200 select-none",
              "hover:shadow-md hover:border-primary/30",
              snapshot.isDragging &&
                "shadow-xl ring-2 ring-primary/30 rotate-1 scale-105"
            )}
            onClick={() => setModalOpen(true)}
          >
            {/* Tags */}
            {cardTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {cardTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag._id}
                    className={cn(
                      "inline-flex text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium",
                      tag.color
                    )}
                  >
                    {tag.name}
                  </span>
                ))}
                {cardTags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{cardTags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <p className="text-sm font-medium text-foreground leading-snug">
              {card.title}
            </p>

            {/* Description preview */}
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {stripHtml(card.description)}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 gap-2">
              {/* Due date */}
              {card.dueDate ? (
                <span
                  className={cn(
                    "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                    dueDateOverdue
                      ? "bg-destructive/10 text-destructive"
                      : dueDateToday
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Calendar className="h-2.5 w-2.5" />
                  {format(new Date(card.dueDate), "MMM d")}
                </span>
              ) : (
                <span />
              )}

              {/* Mobile move button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobilePickerOpen(true);
                  }}
                >
                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                  Move
                </Button>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {/* Card detail modal */}
      <KanbanCardModal
        card={card}
        columns={columns}
        tags={tags}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      {/* Mobile column picker */}
      {isMobile && (
        <MobileColumnPicker
          open={mobilePickerOpen}
          onClose={() => setMobilePickerOpen(false)}
          columns={columns}
          currentColumnId={card.columnId}
          cardId={card._id}
          cardOrder={card.order}
        />
      )}
    </>
  );
}

function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    // SSR fallback
    return html.replace(/<[^>]+>/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

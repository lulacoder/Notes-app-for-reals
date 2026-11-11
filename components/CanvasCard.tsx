"use client";

import { useMutation } from "convex/react";
import { MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CanvasPreview } from "@/components/CanvasPreview";
import { DocumentLink } from "@/components/DocumentLink";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast-notification";
import { getRelativeTime } from "@/lib/relative-time";
import { useUndoDelete } from "@/lib/use-undo-delete";

export function CanvasCard({
  canvas,
}: {
  canvas: {
    _id: Id<"canvases">;
    title: string;
    content: string;
    updatedAt: number;
    isPinned?: boolean;
  };
}) {
  const softDeleteCanvas = useMutation(api.canvases.softDeleteCanvas);
  const togglePin = useMutation(api.canvases.togglePin);
  const notifyDeleted = useUndoDelete();
  const { error } = useToast();

  async function handleDelete() {
    try {
      await softDeleteCanvas({ id: canvas._id });
      notifyDeleted("canvas", canvas._id);
    } catch (cause) {
      console.error("Failed to delete canvas:", cause);
      error("Could not delete canvas", "Please try again.");
    }
  }

  async function handleTogglePin() {
    try {
      await togglePin({ id: canvas._id });
    } catch (cause) {
      console.error("Failed to update canvas:", cause);
      error("Could not update canvas", "Please try again.");
    }
  }

  return (
    <div className="group cursor-pointer rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-lg overflow-hidden">
      <div className="aspect-video bg-muted/30 relative">
        <DocumentLink
          kind="canvas"
          id={canvas._id}
          aria-label={`Open ${canvas.title || "Untitled canvas"}`}
          className="block h-full"
        >
          <CanvasPreview content={canvas.content} className="w-full h-full" />
        </DocumentLink>
        {canvas.isPinned && (
          <div className="absolute top-2 left-2">
            <Pin className="h-4 w-4 text-primary fill-primary" />
          </div>
        )}
        <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                aria-label={`Options for ${canvas.title || "Untitled canvas"}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  void handleTogglePin();
                }}
              >
                <Pin className="h-4 w-4 mr-2" />
                {canvas.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DocumentLink
        kind="canvas"
        id={canvas._id}
        className="block p-3 space-y-1"
      >
        <h3 className="font-medium truncate">{canvas.title || "Untitled canvas"}</h3>
        <p className="text-xs text-muted-foreground">
          {getRelativeTime(canvas.updatedAt)}
        </p>
      </DocumentLink>
    </div>
  );
}


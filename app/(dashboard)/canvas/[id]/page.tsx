"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CanvasEditor } from "@/components/CanvasEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Layers,
  Pin,
  MoreHorizontal,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagAssigner } from "@/components/TagManager";

export default function CanvasEditorPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.id as Id<"canvases">;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  

  const canvas = useQuery(api.canvases.getCanvas, { id: canvasId });
  const updateCanvas = useMutation(api.canvases.updateCanvas);
  const softDeleteCanvas = useMutation(api.canvases.softDeleteCanvas);
  const togglePin = useMutation(api.canvases.togglePin);
  const updateCanvasTags = useMutation(api.canvases.updateCanvasTags);

  // Sync edited title with canvas when not editing
  // This is intentional - we want to sync external state changes
  useEffect(() => {
    if (canvas?.title && !isEditingTitle) {
      setEditedTitle(canvas.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.title]);

  const handleBack = () => {
    router.push("/canvas");
  };

  const handleOpenNote = (noteId: string) => {
    // Navigate to notes page with the specific note
    router.push(`/notes?note=${noteId}`);
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== canvas?.title) {
      await updateCanvas({ id: canvasId, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(canvas?.title || "");
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    await softDeleteCanvas({ id: canvasId });
    router.push("/canvas");
  };

  const handleTogglePin = async () => {
    await togglePin({ id: canvasId });
  };

  const handleUpdateTags = async (tagIds: Id<"tags">[]) => {
    await updateCanvasTags({ id: canvasId, tagIds });
  };

  // Loading state
  if (canvas === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not found state
  if (canvas === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Layers className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-medium">Canvas not found</h2>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Canvases
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 flex items-center gap-3 shrink-0 z-20">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="h-5 w-5 text-primary shrink-0" />

          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-8 max-w-xs"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="font-medium truncate hover:text-primary transition-colors flex items-center gap-2 group"
            >
              {canvas.title}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </button>
          )}

          {canvas.isPinned && (
            <Pin className="h-4 w-4 text-primary fill-primary shrink-0" />
          )}
        </div>

        <TagAssigner
          selectedTagIds={canvas.tagIds || []}
          onUpdateTags={handleUpdateTags}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin}>
              <Pin className="h-4 w-4 mr-2" />
              {canvas.isPinned ? "Unpin" : "Pin"} Canvas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Canvas editor - needs explicit height for tldraw */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <CanvasEditor
          canvasId={canvasId}
          onOpenNote={handleOpenNote}
        />
      </div>
    </div>
  );
}

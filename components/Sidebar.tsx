"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TagFilter } from "@/components/TagManager";
import {
  Plus,
  Search,
  Trash2,
  FileText,
  Pin,
  Layers,
  ChevronDown,
  MoreHorizontal,
  Send,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { createNotesSearchIndex } from "@/lib/fuse";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SidebarProps {
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (id: Id<"notes">) => void;
  onOpenTrash: () => void;
  viewMode?: "list" | "grid";
  onViewModeChange?: (mode: "list" | "grid") => void;
}

export function Sidebar({ 
  selectedNoteId, 
  onSelectNote, 
  onOpenTrash,
  viewMode = "list",
  onViewModeChange,
}: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<Id<"tags"> | null>(null);
  const [canvasesExpanded, setCanvasesExpanded] = useState(true);

  const notesQuery = useQuery(api.notes.listNotes);
  const tagsQuery = useQuery(api.tags.listTags);
  const trashQuery = useQuery(api.notes.listTrash);
  const canvasesQuery = useQuery(api.canvases.listCanvases);

  const notes = useMemo(() => notesQuery || [], [notesQuery]);
  const tags = useMemo(() => tagsQuery || [], [tagsQuery]);
  const trash = useMemo(() => trashQuery || [], [trashQuery]);
  const canvases = useMemo(() => canvasesQuery || [], [canvasesQuery]);

  const createNote = useMutation(api.notes.createNote);
  const createCanvas = useMutation(api.canvases.createCanvas);
  const softDeleteNote = useMutation(api.notes.softDeleteNote);
  const togglePin = useMutation(api.notes.togglePin);

  const searchIndex = useMemo(() => {
    return createNotesSearchIndex(
      notes.map((note) => ({
        _id: note._id,
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt,
      }))
    );
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedTagId) {
      result = result.filter((note) => note.tagIds?.includes(selectedTagId));
    }

    if (searchQuery.trim()) {
      const searchResults = searchIndex.search(searchQuery);
      const searchIds = new Set(searchResults.map((r) => r.item._id));
      result = result.filter((note) => searchIds.has(note._id));
    }

    return result;
  }, [notes, searchQuery, searchIndex, selectedTagId]);

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const regularNotes = filteredNotes.filter((note) => !note.isPinned);

  const handleCreateNote = async () => {
    const noteId = await createNote({});
    onSelectNote(noteId);
  };

  const handleCreateCanvas = async () => {
    const canvasId = await createCanvas({ title: "Untitled Canvas" });
    router.push(`/canvas/${canvasId}`);
  };

  const handleOpenCanvas = (id: Id<"canvases">) => {
    router.push(`/canvas/${id}`);
  };

  const handleSendToCanvas = (
    note: (typeof notes)[0],
    canvasId: Id<"canvases">
  ) => {
    window.dispatchEvent(
      new CustomEvent(`add-note-to-canvas-${canvasId}`, {
        detail: {
          noteId: note._id,
          noteTitle: note.title,
          noteContent: note.content,
        },
      })
    );
    router.push(`/canvas/${canvasId}`);
  };

  const handleDeleteNote = async (id: Id<"notes">) => {
    await softDeleteNote({ id });
    if (selectedNoteId === id) {
      const remaining = notes.filter((n) => n._id !== id);
      if (remaining.length > 0) {
        onSelectNote(remaining[0]._id);
      }
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, id: Id<"notes">) => {
    e.stopPropagation();
    await togglePin({ id });
  };

  const renderNoteItem = (note: (typeof notes)[0], index: number) => {
    const noteTags = note.tagIds
      ?.map((tagId) => tags.find((t) => t._id === tagId))
      .filter(Boolean);

    return (
      <motion.div
        key={note._id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.03 }}
        layout
        className={cn(
          "group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden",
          selectedNoteId === note._id
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onSelectNote(note._id)}
      >
        <AnimatePresence>
          {selectedNoteId === note._id && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full origin-center"
            />
          )}
        </AnimatePresence>
        
        <div className="flex-shrink-0 mt-0.5">
          {note.isPinned ? (
            <motion.div
              initial={{ rotate: -45 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
            </motion.div>
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {note.title || "Untitled"}
          </div>
          <div className="text-xs text-muted-foreground">
            {getRelativeTime(note.updatedAt)}
          </div>
          {noteTags && noteTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {noteTags.slice(0, 2).map((tag) => (
                <span
                  key={tag!._id}
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full",
                    tag!.color,
                    "text-white"
                  )}
                >
                  {tag!.name}
                </span>
              ))}
              {noteTags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{noteTags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              note.isPinned ? "text-amber-500" : "text-muted-foreground"
            )}
            onClick={(e) => handleTogglePin(e, note._id)}
          >
            <Pin className={cn("h-3.5 w-3.5", note.isPinned && "fill-current")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {canvases.length > 0 && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Canvas
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {canvases.map((canvas) => (
                        <DropdownMenuItem
                          key={canvas._id}
                          onClick={() => handleSendToCanvas(note, canvas._id)}
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          {canvas.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleDeleteNote(note._id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 border-r bg-sidebar flex flex-col h-full"
    >
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        
        {/* View mode toggle */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => onViewModeChange("list")}
            >
              <LayoutList className="h-4 w-4 mr-1.5" />
              List
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Grid
            </Button>
          </div>
        )}
      </div>

      {/* Tag filter */}
      <TagFilter selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} />

      {/* Notes list */}
      <ScrollArea className="flex-1">
        {filteredNotes.length === 0 && canvases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 text-center text-muted-foreground text-sm"
          >
            {searchQuery || selectedTagId ? "No notes found" : "No notes yet"}
          </motion.div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Pinned notes section */}
            <AnimatePresence>
              {pinnedNotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </div>
                  {pinnedNotes.map((note, i) => renderNoteItem(note, i))}
                  {regularNotes.length > 0 && (
                    <div className="px-2 py-1 mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Notes
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Regular notes */}
            <AnimatePresence>
              {regularNotes.map((note, i) => renderNoteItem(note, i))}
            </AnimatePresence>

            {/* Canvases section */}
            {canvases.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-2 border-t"
              >
                <button
                  onClick={() => setCanvasesExpanded(!canvasesExpanded)}
                  className="w-full px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <motion.div
                    animate={{ rotate: canvasesExpanded ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                  <Layers className="h-3 w-3" />
                  Canvases
                  <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                    {canvases.length}
                  </Badge>
                </button>
                <AnimatePresence>
                  {canvasesExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 space-y-0.5 overflow-hidden"
                    >
                      {canvases.map((canvas, index) => (
                        <motion.div
                          key={canvas._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleOpenCanvas(canvas._id)}
                          className="group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        >
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {canvas.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getRelativeTime(canvas.updatedAt)}
                            </div>
                          </div>
                          {canvas.isPinned && (
                            <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-3 border-t space-y-2"
      >
        <div className="flex gap-2">
          <Button onClick={handleCreateNote} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Note
          </Button>
          <Button onClick={handleCreateCanvas} variant="outline" className="flex-1">
            <Layers className="h-4 w-4 mr-2" />
            Canvas
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={onOpenTrash}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Trash
          {trash.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {trash.length}
            </Badge>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

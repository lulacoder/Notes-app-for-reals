"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TagFilter } from "@/components/TagManager";
import { Plus, Search, Trash2, FileText, Pin } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { createNotesSearchIndex } from "@/lib/fuse";

interface SidebarProps {
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (id: Id<"notes">) => void;
  onOpenTrash: () => void;
}

export function Sidebar({ selectedNoteId, onSelectNote, onOpenTrash }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<Id<"tags"> | null>(null);

  const notes = useQuery(api.notes.listNotes) || [];
  const tags = useQuery(api.tags.listTags) || [];
  const trash = useQuery(api.notes.listTrash) || [];
  const createNote = useMutation(api.notes.createNote);
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

    // Filter by tag
    if (selectedTagId) {
      result = result.filter((note) => note.tagIds?.includes(selectedTagId));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const searchResults = searchIndex.search(searchQuery);
      const searchIds = new Set(searchResults.map((r) => r.item._id));
      result = result.filter((note) => searchIds.has(note._id));
    }

    return result;
  }, [notes, searchQuery, searchIndex, selectedTagId]);

  // Separate pinned and regular notes
  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const regularNotes = filteredNotes.filter((note) => !note.isPinned);

  const handleCreateNote = async () => {
    const noteId = await createNote({});
    onSelectNote(noteId);
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

  const renderNoteItem = (note: (typeof notes)[0]) => {
    const noteTags = note.tagIds
      ?.map((tagId) => tags.find((t) => t._id === tagId))
      .filter(Boolean);

    return (
      <div
        key={note._id}
        className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
          selectedNoteId === note._id
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent"
        }`}
        onClick={() => onSelectNote(note._id)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {note.isPinned ? (
            <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
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
            <div className="flex flex-wrap gap-1 mt-1">
              {noteTags.slice(0, 2).map((tag) => (
                <span
                  key={tag!._id}
                  className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${tag!.color} text-white`}
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
            className={`h-7 w-7 p-0 ${
              note.isPinned ? "text-amber-500" : "text-muted-foreground"
            }`}
            onClick={(e) => handleTogglePin(e, note._id)}
          >
            <Pin className={`h-3.5 w-3.5 ${note.isPinned ? "fill-current" : ""}`} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{note.title || "Untitled"}&quot; will be moved to trash.
                  You can restore it within 30 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteNote(note._id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  return (
    <div className="w-72 border-r bg-sidebar flex flex-col h-full">
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
      </div>

      {/* Tag filter */}
      <TagFilter selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} />

      {/* Notes list */}
      <ScrollArea className="flex-1">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery || selectedTagId ? "No notes found" : "No notes yet"}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </div>
                {pinnedNotes.map(renderNoteItem)}
                {regularNotes.length > 0 && (
                  <div className="px-2 py-1 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Notes
                  </div>
                )}
              </>
            )}
            {/* Regular notes */}
            {regularNotes.map(renderNoteItem)}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t space-y-2">
        <Button
          onClick={handleCreateNote}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
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
      </div>
    </div>
  );
}

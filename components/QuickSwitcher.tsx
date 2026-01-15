"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, Pin, Trash2, Tag } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (id: Id<"notes">) => void;
  onOpenTrash?: () => void;
}

export function QuickSwitcher({ open, onOpenChange, onSelectNote, onOpenTrash }: QuickSwitcherProps) {
  const notesQuery = useQuery(api.notes.listNotes);
  const tagsQuery = useQuery(api.tags.listTags);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (noteId: string) => {
      onSelectNote(noteId as Id<"notes">);
      onOpenChange(false);
    },
    [onSelectNote, onOpenChange]
  );

  const handleOpenTrash = useCallback(() => {
    onOpenTrash?.();
    onOpenChange(false);
  }, [onOpenTrash, onOpenChange]);

  const notesWithTags = useMemo(() => {
    const notes = notesQuery || [];
    const tags = tagsQuery || [];
    return notes.map((note) => ({
      ...note,
      tags: note.tagIds
        ?.map((tagId) => tags.find((t) => t._id === tagId))
        .filter(Boolean) || [],
    }));
  }, [notesQuery, tagsQuery]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search notes... (⌘K)" />
      <CommandList>
        <CommandEmpty>No notes found.</CommandEmpty>
        <CommandGroup heading="Notes">
          {notesWithTags.map((note) => (
            <CommandItem
              key={note._id}
              value={`${note.title} ${note.content}`}
              onSelect={() => handleSelect(note._id)}
              className="flex items-center gap-2"
            >
              {note.isPinned ? (
                <Pin className="h-4 w-4 text-amber-500" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{getRelativeTime(note.updatedAt)}</span>
                  {note.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {note.tags.map((tag) => tag?.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleOpenTrash}>
            <Trash2 className="mr-2 h-4 w-4" />
            Open Trash
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

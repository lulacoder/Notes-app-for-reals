"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";

import { useCallback, useMemo } from "react";
import type { Preloaded } from "convex/react";

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
import type { PreloadedNotes } from "@/lib/notes-data";
import { useNoteSummaries } from "@/lib/use-notes-queries";

const EMPTY: never[] = [];

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (id: Id<"notes">) => void;
  onOpenTrash?: () => void;
  preloadedNotes: PreloadedNotes;
  preloadedTags: Preloaded<typeof api.tags.listTags>;
}

export function QuickSwitcher({
  open,
  onOpenChange,
  onSelectNote,
  onOpenTrash,
  preloadedNotes,
  preloadedTags,
}: QuickSwitcherProps) {
  const notesQuery = useNoteSummaries(preloadedNotes);
  const tagsQuery = usePreloadedAuthQuery(preloadedTags) ?? EMPTY;


  const tagsById = useMemo(() => {
    return new Map(tagsQuery.map((tag) => [tag._id, tag]));
  }, [tagsQuery]);

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
    const notes = notesQuery;
    return notes.map((note) => ({
      ...note,
      tags: note.tagIds
        ?.map((tagId) => tagsById.get(tagId))
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag)) || [],
    }));
  }, [notesQuery, tagsById]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search notes... (⌘K)" />
      <CommandList>
        <CommandEmpty>No notes found.</CommandEmpty>
        <CommandGroup heading="Notes">
          {notesWithTags.map((note) => (
            <CommandItem
              key={note._id}
              value={`${note.title} ${note.searchText}`}
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

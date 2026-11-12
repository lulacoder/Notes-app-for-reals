"use client";

import { useCallback, useMemo } from "react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import type { Preloaded } from "convex/react";
import { ArrowUpRight, FileText, LayoutDashboard, Pin, Tag, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getRelativeTime } from "@/lib/relative-time";
import type { PreloadedCanvases, PreloadedNotes } from "@/lib/notes-data";
import { useNoteSummaries } from "@/lib/use-notes-queries";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import styles from "./QuickSwitcher.module.css";

const EMPTY: never[] = [];

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (id: Id<"notes">) => void;
  onSelectCanvas: (id: Id<"canvases">) => void;
  onOpenTrash?: () => void;
  preloadedNotes: PreloadedNotes;
  preloadedCanvases: PreloadedCanvases;
  preloadedTags: Preloaded<typeof api.tags.listTags>;
}

export function QuickSwitcher({
  open,
  onOpenChange,
  onSelectNote,
  onSelectCanvas,
  onOpenTrash,
  preloadedNotes,
  preloadedCanvases,
  preloadedTags,
}: QuickSwitcherProps) {
  const notes = useNoteSummaries(preloadedNotes);
  const canvases = usePreloadedAuthQuery(preloadedCanvases) ?? EMPTY;
  const tags = usePreloadedAuthQuery(preloadedTags) ?? EMPTY;
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag._id, tag])), [tags]);

  const handleOpenTrash = useCallback(() => {
    onOpenTrash?.();
    onOpenChange(false);
  }, [onOpenTrash, onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search workspace"
      description="Search notes and canvases, or open recently deleted items."
      className={cn("gap-0 rounded-2xl border-border/60 shadow-xl sm:max-w-xl [&_[data-slot=dialog-close]]:right-5 [&_[data-slot=dialog-close]]:top-5", styles.palette)}
    >
      <div className="px-5 pb-2 pt-5 pr-12">
        <p className="text-sm font-semibold text-foreground">Search workspace</p>
      </div>
      <CommandInput
        aria-label="Search notes and canvases"
        placeholder="Search notes and canvases"
        className="text-sm sm:text-base"
      />
      <CommandList className="max-h-[min(55vh,420px)] scroll-py-2 px-1 py-2">
        <CommandEmpty className="px-6 py-12 text-muted-foreground">
          No results found. Try a different search.
        </CommandEmpty>
        <CommandGroup heading="Notes">
          {notes.map((note) => {
            const noteTags = note.tagIds?.map((id) => tagsById.get(id)).filter((tag) => tag !== undefined) ?? [];
            return (
              <CommandItem
                key={note._id}
                value={`note:${note._id}`}
                keywords={[note.title, note.searchText]}
                onSelect={() => {
                  onSelectNote(note._id);
                  onOpenChange(false);
                }}
                className="group my-0.5 gap-3 rounded-xl px-3 py-2.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{note.title || "Untitled"}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    {getRelativeTime(note.updatedAt)}
                    {noteTags.length > 0 && <><span aria-hidden="true">·</span><Tag className="size-3" /><span className="truncate">{noteTags.map((tag) => tag.name).join(", ")}</span></>}
                  </span>
                </span>
                {note.isPinned && <Pin className="size-4 text-amber-500" aria-label="Pinned" />}
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" aria-hidden="true" />
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Canvases">
          {canvases.map((canvas) => (
            <CommandItem
              key={canvas._id}
              value={`canvas:${canvas._id}`}
              keywords={[canvas.title]}
              onSelect={() => {
                onSelectCanvas(canvas._id);
                onOpenChange(false);
              }}
              className="group my-0.5 gap-3 rounded-xl px-3 py-2.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
                <LayoutDashboard className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{canvas.title || "Untitled"}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{getRelativeTime(canvas.updatedAt)}</span>
              </span>
              {canvas.isPinned && <Pin className="size-4 text-amber-500" aria-label="Pinned" />}
              <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" aria-hidden="true" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem value="open recently deleted trash" onSelect={handleOpenTrash} className="my-0.5 gap-3 rounded-xl px-3 py-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Trash2 className="size-4" /></span>
            <span className="font-medium">Open recently deleted</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="hidden items-center gap-3 border-t border-border/70 px-5 py-3 text-[11px] text-muted-foreground sm:flex" aria-hidden="true">
        <span><kbd className="rounded border bg-muted px-1.5 py-0.5">↑</kbd> <kbd className="rounded border bg-muted px-1.5 py-0.5">↓</kbd> to navigate</span>
        <span><kbd className="rounded border bg-muted px-1.5 py-0.5">Enter</kbd> to open</span>
        <span className="ml-auto"><kbd className="rounded border bg-muted px-1.5 py-0.5">esc</kbd> to close</span>
      </div>
    </CommandDialog>
  );
}

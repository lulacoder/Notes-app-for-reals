"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef, useMemo, ViewTransition } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagAssigner } from "@/components/TagManager";
import { RichTextEditor } from "@/components/editor";
import type { RichTextEditorRef } from "@/components/editor/RichTextEditor";
import { Pin, History, Sparkles, MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useImageUpload } from "@/lib/use-image-upload";
import { extractTitleFromHtml } from "@/lib/html-utils";
import { useAutosave } from "@/lib/use-autosave";
import { optionLabel, useKeyboardPlatform } from "@/lib/use-keyboard-platform";
import { SaveStatus } from "@/components/SaveStatus";
import { useToast } from "@/components/ui/toast-notification";

type NoteDraft = Pick<Doc<"notes">, "title" | "content">;

interface NoteEditorProps {
  noteId: Id<"notes"> | null;
  initialNote?: Doc<"notes"> | null;
}

const VersionHistory = dynamic(
  () => import("@/components/VersionHistory").then((mod) => mod.VersionHistory),
  { ssr: false }
);
const KanbanCardModal = dynamic(
  () => import("@/components/kanban/KanbanCardModal").then((mod) => mod.KanbanCardModal),
  { ssr: false }
);

export function NoteEditor({ noteId, initialNote }: NoteEditorProps) {
  const platform = useKeyboardPlatform();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useConvexAuth();
  const liveNote = useQuery(api.notes.getNote, noteId && isAuthenticated ? { id: noteId } : "skip");
  const note = liveNote === undefined ? initialNote : liveNote;
  const isNoteReady = note != null;
  const tags = useQuery(api.tags.listTags, isAuthenticated ? {} : "skip");
  const updateNote = useMutation(api.notes.updateNote);
  const togglePin = useMutation(api.notes.togglePin);
  const updateNoteTags = useMutation(api.notes.updateNoteTags);
  const createVersion = useMutation(api.versions.createVersion);

  const [content, setContent] = useState(initialNote?.content ?? "");
  const [title, setTitle] = useState(initialNote?.title ?? "");
  const [showVersions, setShowVersions] = useState(false);
  const [taskSelection, setTaskSelection] = useState<string | null>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const versionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmittedRef = useRef<NoteDraft | null>(null);
  const lastVersionRef = useRef({ title: "", content: "" });
  const [loadedNoteId, setLoadedNoteId] = useState(initialNote?._id ?? null);
  const [conflict, setConflict] = useState(false);
  const prevNoteIdRef = useRef<Id<"notes"> | null>(null);

  // Sync state when note changes - defer state updates to avoid synchronous setState
  useEffect(() => {
    if (note && prevNoteIdRef.current !== noteId) {
      // Convert markdown to HTML if needed (legacy content)
      const noteContent = note.content || "";
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setTitle(note.title);
        setContent(noteContent);
        setLoadedNoteId(noteId);
        setConflict(false);
      });
      lastSubmittedRef.current = { title: note.title, content: noteContent };
      lastVersionRef.current = { title: note.title, content: noteContent };
      prevNoteIdRef.current = noteId;
    } else if (!note && noteId === null) {
      queueMicrotask(() => {
        setTitle("");
        setContent("");
        setLoadedNoteId(null);
      });
      lastSubmittedRef.current = null;
      lastVersionRef.current = { title: "", content: "" };
      prevNoteIdRef.current = null;
    }
  }, [note, noteId]);

  // Create version after significant edits (5 min of no changes)
  const saveVersion = useCallback(
    async (versionTitle: string, versionContent: string) => {
      if (!noteId || !isNoteReady) return;

      if (
        versionTitle === lastVersionRef.current.title &&
        versionContent === lastVersionRef.current.content
      ) {
        return;
      }

      try {
        await createVersion({
          noteId,
          title: versionTitle || "Untitled",
          content: versionContent,
        });
        lastVersionRef.current = { title: versionTitle, content: versionContent };
      } catch (error) {
        console.error("Failed to create version:", error);
      }
    },
    [noteId, isNoteReady, createVersion]
  );

  // Compare against submitted edits so reverting during a slow save is preserved.
  const saveNote = useCallback(
    async (draft: NoteDraft) => {
      if (!noteId) return;
      const previous = lastSubmittedRef.current;
      const updates: Partial<NoteDraft> = {};
      if (draft.title !== previous?.title) updates.title = draft.title;
      if (draft.content !== previous?.content) updates.content = draft.content;
      if (updates.title === undefined && updates.content === undefined) return;

      lastSubmittedRef.current = draft;
      try {
        await updateNote({ id: noteId, ...updates, expected: previous ?? undefined });
      } catch (error) {
        lastSubmittedRef.current = previous;
        if (error instanceof ConvexError && error.data === "NOTE_EDIT_CONFLICT") {
          setConflict(true);
        }
        throw error;
      }
    },
    [noteId, updateNote]
  );

  const draft = useMemo(() => ({ title: title || "Untitled", content }), [title, content]);
  const autosave = useAutosave(draft, saveNote, isNoteReady && noteId !== null && loadedNoteId === noteId && !conflict);

  useEffect(() => {
    if (!liveNote || liveNote._id !== noteId || loadedNoteId !== noteId || conflict) return;
    const previous = lastSubmittedRef.current;
    if (!previous || draft.title !== previous.title || draft.content !== previous.content) return;
    if (liveNote.title === previous.title && liveNote.content === previous.content) return;
    // Convex completes saves after subscriptions reflect their writes, so a saved
    // draft can accept the latest snapshot even if another device reverted it.
    if (autosave.status !== "saved") return;
    lastSubmittedRef.current = { title: liveNote.title, content: liveNote.content };
    queueMicrotask(() => {
      setTitle(liveNote.title);
      setContent(liveNote.content);
    });
  }, [liveNote, noteId, loadedNoteId, conflict, draft, autosave.status]);

  const resolveConflict = async (keepLocal: boolean) => {
    if (!liveNote) return;
    await autosave.discardPending();
    lastSubmittedRef.current = { title: liveNote.title, content: liveNote.content };
    if (!keepLocal) {
      setTitle(liveNote.title);
      setContent(liveNote.content);
    }
    setConflict(false);
  };

  // Debounced version creation (5 minutes)
  useEffect(() => {
    if (versionTimeoutRef.current) {
      clearTimeout(versionTimeoutRef.current);
    }

    versionTimeoutRef.current = setTimeout(() => {
      saveVersion(title, content);
    }, 5 * 60 * 1000);

    return () => {
      if (versionTimeoutRef.current) {
        clearTimeout(versionTimeoutRef.current);
      }
    };
  }, [title, content, saveVersion]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    if (!title || title === "Untitled") {
      const extractedTitle = extractTitleFromHtml(newContent);
      if (extractedTitle) {
        setTitle(extractedTitle.substring(0, 100));
      }
    }
  };

  const handleTogglePin = async () => {
    if (!noteId) return;
    await togglePin({ id: noteId });
  };

  const handleUpdateTags = async (tagIds: Id<"tags">[]) => {
    if (!noteId) return;
    await updateNoteTags({ id: noteId, tagIds });
  };

  const handleRestoreVersion = (versionTitle: string, versionContent: string) => {
    setTitle(versionTitle);
    setContent(versionContent);
    setShowVersions(false);
  };

  // Image upload handler using Convex storage
  const { uploadImage } = useImageUpload({ noteId: noteId ?? undefined });

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await uploadImage(file);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      // Fallback to base64 if upload fails
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const tagsById = useMemo(() => {
    const availableTags = tags ?? [];
    return new Map(availableTags.map((tag) => [tag._id, tag]));
  }, [tags]);

  const noteTags = useMemo(() => {
    return (note?.tagIds || [])
      .map((tagId: Id<"tags">) => tagsById.get(tagId))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
  }, [note?.tagIds, tagsById]);

  if (!noteId) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center bg-background"
      >
        <div className="text-center text-muted-foreground">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary/30" />
          </motion.div>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium"
          >
            Select a note or create a new one
          </motion.p>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm mt-2 opacity-75"
          >
            Press <kbd className="px-2 py-1 rounded-md bg-muted text-xs font-mono">{optionLabel(platform)}+Shift+N</kbd> to create
          </motion.p>
        </div>
      </motion.div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col h-full overflow-hidden bg-background"
    >
      {/* Title Bar */}
      <motion.div 
        initial={false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="px-3 py-3 sm:px-4 md:px-6 md:py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back button - mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={() => router.push("/notes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <ViewTransition name={`note-title-${noteId}`}><div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-1 min-w-0 text-xl sm:text-2xl font-bold outline-none border-none bg-transparent placeholder:text-muted-foreground/50 tracking-tight w-full"
          />
          </div></ViewTransition>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Tags display - hidden on very small screens */}
            <AnimatePresence>
              {noteTags.slice(0, 2).map((tag) => (
                <motion.div
                  key={tag._id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="hidden sm:block"
                >
                  <Badge
                    className={`${tag.color} text-white text-xs px-2 py-0.5`}
                  >
                    {tag.name}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            {noteTags.length > 2 && (
              <span className="hidden sm:inline text-xs text-muted-foreground ml-1">
                +{noteTags.length - 2}
              </span>
            )}

            {/* Tag assigner */}
            <SaveStatus status={autosave.status} retry={autosave.retry} quiet />
            <TagAssigner
              selectedTagIds={note.tagIds || []}
              onUpdateTags={handleUpdateTags}
            />

            {/* Desktop: Individual buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Pin button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 p-0 ${
                  note.isPinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={handleTogglePin}
                title={note.isPinned ? "Unpin note" : "Pin note"}
              >
                <Pin className={`h-4 w-4 transition-transform ${note.isPinned ? "fill-current scale-110" : ""}`} />
              </Button>

              {/* Version history button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowVersions(true)}
                title="Version history"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile: Dropdown menu for actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 sm:hidden text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  <Pin className={`h-4 w-4 mr-2 ${note.isPinned ? "fill-amber-500 text-amber-500" : ""}`} />
                  {note.isPinned ? "Unpin note" : "Pin note"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowVersions(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Version history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm">
          <span>This note changed on another device. Choose which version to keep.</span>
          <Button size="sm" variant="outline" onClick={() => void resolveConflict(false)}>Use other version</Button>
          <Button size="sm" variant="outline" onClick={() => void resolveConflict(true)}>Keep my version</Button>
        </div>
      )}

      {/* Rich Text Editor */}
      <motion.div 
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 overflow-hidden"
      >
        <RichTextEditor
          ref={editorRef}
          content={content}
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
          onCreateTask={isAuthenticated && noteId && !note.isDeleted ? setTaskSelection : undefined}
          placeholder="Start writing... Use '/' for commands"
        />
      </motion.div>

      {noteId && taskSelection !== null && (
        <KanbanCardModal
          sourceNote={{ id: noteId, title, selection: taskSelection }}
          tags={tags ?? []}
          open
          onClose={() => setTaskSelection(null)}
          onCloseAutoFocus={() => editorRef.current?.focus()}
          onCreated={(boardId, cardId) => {
            toast({
              type: "success",
              title: "Task created",
              action: {
                label: "View task",
                onClick: () => router.push(`/kanban?board=${boardId}&card=${cardId}`),
              },
            });
          }}
        />
      )}

      {/* Version history modal */}
      <AnimatePresence>
        {showVersions && (
          <VersionHistory
            noteId={noteId}
            onClose={() => setShowVersions(false)}
            onRestore={handleRestoreVersion}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

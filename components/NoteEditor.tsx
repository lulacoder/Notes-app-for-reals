"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagAssigner } from "@/components/TagManager";
import { VersionHistory } from "@/components/VersionHistory";
import { RichTextEditor } from "@/components/editor";
import { Pin, History, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useImageUpload } from "@/lib/use-image-upload";

interface NoteEditorProps {
  noteId: Id<"notes"> | null;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useQuery(api.notes.getNote, noteId ? { id: noteId } : "skip");
  const tags = useQuery(api.tags.listTags) || [];
  const updateNote = useMutation(api.notes.updateNote);
  const togglePin = useMutation(api.notes.togglePin);
  const updateNoteTags = useMutation(api.notes.updateNoteTags);
  const createVersion = useMutation(api.versions.createVersion);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: "", content: "" });
  const lastVersionRef = useRef({ title: "", content: "" });
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
      });
      lastSavedRef.current = { title: note.title, content: noteContent };
      lastVersionRef.current = { title: note.title, content: noteContent };
      prevNoteIdRef.current = noteId;
    } else if (!note && noteId === null) {
      queueMicrotask(() => {
        setTitle("");
        setContent("");
      });
      lastSavedRef.current = { title: "", content: "" };
      lastVersionRef.current = { title: "", content: "" };
      prevNoteIdRef.current = null;
    }
  }, [note, noteId]);

  // Create version after significant edits (5 min of no changes)
  const saveVersion = useCallback(
    async (versionTitle: string, versionContent: string) => {
      if (!noteId) return;

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
    [noteId, createVersion]
  );

  // Auto-save with debounce
  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!noteId) return;

      if (
        newTitle === lastSavedRef.current.title &&
        newContent === lastSavedRef.current.content
      ) {
        return;
      }

      try {
        await updateNote({
          id: noteId,
          title: newTitle || "Untitled",
          content: newContent,
        });
        lastSavedRef.current = { title: newTitle, content: newContent };
      } catch (error) {
        console.error("Failed to save note:", error);
      }
    },
    [noteId, updateNote]
  );

  // Debounced save effect (1 second)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(title, content);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, saveNote]);

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

    // Auto-extract title from first heading or text if title is empty
    if (!title || title === "Untitled") {
      // Try to extract from HTML content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = newContent;
      const firstHeading = tempDiv.querySelector("h1, h2, h3");
      const firstText = tempDiv.textContent?.trim().split("\n")[0];
      
      const extractedTitle = firstHeading?.textContent?.trim() || firstText;
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

  // Get current note tags
  const noteTags = (note?.tagIds || [])
    .map((tagId: Id<"tags">) => tags.find((t) => t._id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

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
            Press <kbd className="px-2 py-1 rounded-md bg-muted text-xs font-mono">Ctrl+N</kbd> to create
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col h-full overflow-hidden bg-background"
    >
      {/* Title Bar */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-3 md:px-6 md:py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-1 text-2xl font-bold outline-none border-none bg-transparent placeholder:text-muted-foreground/50 tracking-tight"
          />
          
          <div className="flex items-center gap-1">
            {/* Tags display */}
            <AnimatePresence>
              {noteTags.slice(0, 3).map((tag) => (
                <motion.div
                  key={tag._id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Badge
                    className={`${tag.color} text-white text-xs px-2 py-0.5`}
                  >
                    {tag.name}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            {noteTags.length > 3 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{noteTags.length - 3}
              </span>
            )}

            {/* Tag assigner */}
            <TagAssigner
              selectedTagIds={note.tagIds || []}
              onUpdateTags={handleUpdateTags}
            />

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
        </div>
      </motion.div>

      {/* Rich Text Editor */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 overflow-hidden"
      >
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
          placeholder="Start writing... Use '/' for commands"
        />
      </motion.div>

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

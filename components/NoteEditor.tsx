"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagAssigner } from "@/components/TagManager";
import { VersionHistory } from "@/components/VersionHistory";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { FileText, Pin, History } from "lucide-react";

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

  // Sync state when note changes
  useEffect(() => {
    // Only update local state when note changes or on initial load
    if (note && (prevNoteIdRef.current !== noteId)) {
      setTitle(note.title);
      setContent(note.content);
      lastSavedRef.current = { title: note.title, content: note.content };
      lastVersionRef.current = { title: note.title, content: note.content };
      prevNoteIdRef.current = noteId;
    } else if (!note && noteId === null) {
      setTitle("");
      setContent("");
      lastSavedRef.current = { title: "", content: "" };
      lastVersionRef.current = { title: "", content: "" };
      prevNoteIdRef.current = null;
    }
  }, [note, noteId]);

  // Create version after significant edits (5 min of no changes)
  const saveVersion = useCallback(
    async (versionTitle: string, versionContent: string) => {
      if (!noteId) return;

      // Only save version if content actually changed
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

      // Only save if something changed
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
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (versionTimeoutRef.current) {
        clearTimeout(versionTimeoutRef.current);
      }
    };
  }, [title, content, saveVersion]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Auto-extract title from first line if title is empty or "Untitled"
    if (!title || title === "Untitled") {
      const firstLine = newContent.split("\n")[0].trim();
      // Remove markdown heading syntax
      const cleanTitle = firstLine.replace(/^#+\s*/, "").trim();
      if (cleanTitle) {
        setTitle(cleanTitle.substring(0, 100));
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

  // Get current note tags
  const noteTags = (note?.tagIds || [])
    .map((tagId: Id<"tags">) => tags.find((t) => t._id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Select a note or create a new one</p>
          <p className="text-sm mt-1 opacity-75">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl+N</kbd> to create
          </p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b bg-background flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="flex-1 min-w-[200px] text-xl font-semibold outline-none border-none bg-transparent"
        />
        
        <div className="flex items-center gap-1">
          {/* Tags display */}
          <div className="flex items-center gap-1 mr-2">
            {noteTags.slice(0, 3).map((tag) => (
              <Badge
                key={tag._id}
                className={`${tag.color} text-white text-[10px] px-1.5 py-0`}
              >
                {tag.name}
              </Badge>
            ))}
            {noteTags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{noteTags.length - 3}
              </span>
            )}
          </div>

          {/* Tag assigner */}
          <TagAssigner
            selectedTagIds={note.tagIds || []}
            onUpdateTags={handleUpdateTags}
          />

          {/* Pin button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              note.isPinned ? "text-amber-500" : "text-muted-foreground"
            }`}
            onClick={handleTogglePin}
            title={note.isPinned ? "Unpin note" : "Pin note"}
          >
            <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current" : ""}`} />
          </Button>

          {/* Version history button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={() => setShowVersions(true)}
            title="Version history"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Markdown
          </div>
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing in Markdown...

# Heading 1
## Heading 2

**bold** and *italic*

- List item 1
- List item 2

```code block```

[Link](https://example.com)"
            className="flex-1 resize-none border-none rounded-none p-4 focus-visible:ring-0 font-mono text-sm bg-background"
          />
        </div>

        {/* Preview pane */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preview
          </div>
          <div className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {content || "*Start typing to see preview...*"}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Version history modal */}
      {showVersions && (
        <VersionHistory
          noteId={noteId}
          onClose={() => setShowVersions(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { FileText } from "lucide-react";

interface NoteEditorProps {
  noteId: Id<"notes"> | null;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useQuery(api.notes.getNote, noteId ? { id: noteId } : "skip");
  const updateNote = useMutation(api.notes.updateNote);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: "", content: "" });

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      lastSavedRef.current = { title: note.title, content: note.content };
    } else {
      setTitle("");
      setContent("");
      lastSavedRef.current = { title: "", content: "" };
    }
  }, [note?._id, note?.title, note?.content]);

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

  // Debounced save effect
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

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Select a note or create a new one</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Title input */}
      <div className="p-4 border-b bg-white">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl font-semibold outline-none border-none bg-transparent"
        />
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
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
            className="flex-1 resize-none border-none rounded-none p-4 focus-visible:ring-0 font-mono text-sm"
          />
        </div>

        {/* Preview pane */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
            Preview
          </div>
          <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {content || "*Start typing to see preview...*"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

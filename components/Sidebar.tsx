"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, Trash2, FileText } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { createNotesSearchIndex } from "@/lib/fuse";

interface SidebarProps {
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (id: Id<"notes">) => void;
}

export function Sidebar({ selectedNoteId, onSelectNote }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const notes = useQuery(api.notes.listNotes) || [];
  const createNote = useMutation(api.notes.createNote);
  const deleteNote = useMutation(api.notes.deleteNote);

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
    if (!searchQuery.trim()) {
      return notes;
    }
    const results = searchIndex.search(searchQuery);
    return results.map((result) => {
      const note = notes.find((n) => n._id === result.item._id);
      return note!;
    });
  }, [notes, searchQuery, searchIndex]);

  const handleCreateNote = async () => {
    const noteId = await createNote({});
    onSelectNote(noteId);
  };

  const handleDeleteNote = async (id: Id<"notes">) => {
    await deleteNote({ id });
    if (selectedNoteId === id) {
      const remaining = notes.filter((n) => n._id !== id);
      if (remaining.length > 0) {
        onSelectNote(remaining[0]._id);
      }
    }
  };

  return (
    <div className="w-72 border-r bg-gray-50 flex flex-col h-full">
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? "No notes found" : "No notes yet"}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedNoteId === note._id
                    ? "bg-blue-100 text-blue-900"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => onSelectNote(note._id)}
              >
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {note.title || "Untitled"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRelativeTime(note.updatedAt)}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete &quot;{note.title || "Untitled"}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteNote(note._id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-white">
        <Button
          onClick={handleCreateNote}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>
    </div>
  );
}

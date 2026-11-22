"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { TrashGroups } from "@/components/TrashGroups";
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
import { Trash2, RotateCcw, FileText, Clock } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { addDays, isAfter } from "date-fns";
import { useToast } from "@/components/ui/toast-notification";

export function TrashView() {
  const [now, setNow] = useState(() => Date.now());
  const trash = useQuery(api.notes.listTrash);
  const restoreNote = useMutation(api.notes.restoreNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const emptyTrash = useMutation(api.notes.emptyTrash);
  const { error } = useToast();

  // Update timestamp periodically for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  const handleRestore = async (id: Id<"notes">) => {
    try { await restoreNote({ id }); } catch (cause) {
      console.error("Failed to restore note:", cause);
      error("Could not restore note", "Please try again.");
    }
  };

  const handlePermanentDelete = async (id: Id<"notes">) => {
    try { await deleteNote({ id }); } catch (cause) {
      console.error("Failed to delete note permanently:", cause);
      error("Could not delete note", "Please try again.");
    }
  };

  const handleEmptyTrash = async () => {
    try { await emptyTrash({ all: true }); } catch (cause) {
      console.error("Failed to empty deleted notes:", cause);
      error("Could not delete notes", "Please try again.");
    }
  };

  // Calculate days until auto-delete
  const getDaysLeft = (deletedAt: number) => {
    const autoDeleteDate = addDays(new Date(deletedAt), 30);
    if (isAfter(new Date(now), autoDeleteDate)) {
      return 0;
    }
    return Math.ceil((autoDeleteDate.getTime() - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {trash && trash.length > 0 && (
        <div className="flex justify-end border-b px-4 py-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete all notes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all notes permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {trash.length} notes in the trash.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleEmptyTrash}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete all notes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {trash === undefined ? <p role="status" className="text-sm text-muted-foreground">Loading deleted notes...</p> : <TrashGroups items={trash} kind="notes"
          renderItem={(note) => {
              const daysLeft = getDaysLeft(note.deletedAt || 0);
              return (
                <li key={note._id} className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{note.title || "Untitled"}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Deleted {getRelativeTime(note.deletedAt || 0)}</span>
                        <span className="text-amber-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {daysLeft > 0 ? `${daysLeft}d left` : "Expiring soon"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Restore" aria-label={`Restore ${note.title || "Untitled"}`}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore this note?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{note.title || "Untitled"}&quot; will be restored to your notes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRestore(note._id)}>Restore note</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Delete permanently" aria-label={`Delete ${note.title || "Untitled"} permanently`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete &quot;{note.title || "Untitled"}&quot;.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(note._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Forever
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </li>
              );
            }} />}
      </div>

      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        Notes in trash are automatically deleted after 30 days
      </div>
    </div>
  );
}

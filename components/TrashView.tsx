"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface TrashViewProps {
  onClose: () => void;
  onSelectNote: (id: Id<"notes">) => void;
}

export function TrashView({ onClose }: TrashViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const trash = useQuery(api.notes.listTrash) || [];
  const restoreNote = useMutation(api.notes.restoreNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const emptyTrash = useMutation(api.notes.emptyTrash);

  // Update timestamp periodically for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  const handleRestore = async (id: Id<"notes">) => {
    await restoreNote({ id });
  };

  const handlePermanentDelete = async (id: Id<"notes">) => {
    await deleteNote({ id });
  };

  const handleEmptyTrash = async () => {
    await emptyTrash({ all: true });
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Trash</h2>
          <span className="text-sm text-muted-foreground">({trash.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {trash.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty trash?</AlertDialogTitle>
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
                    Empty Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {trash.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Trash is empty</p>
            <p className="text-sm mt-1">Deleted notes will appear here</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {trash.map((note) => {
              const daysLeft = getDaysLeft(note.deletedAt || 0);
              return (
                <div
                  key={note._id}
                  className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(note._id)}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Delete permanently">
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
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        Notes in trash are automatically deleted after 30 days
      </div>
    </div>
  );
}

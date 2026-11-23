"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { History, RotateCcw, Eye, Clock, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VersionHistoryProps {
  noteId: Id<"notes">;
  onClose: () => void;
  onRestore: (versionId: Id<"noteVersions">) => Promise<void>;
  restoring?: boolean;
  restoreDisabled?: boolean;
}

export function VersionHistory({ noteId, onClose, onRestore, restoring = false, restoreDisabled = false }: VersionHistoryProps) {
  const [previewVersionId, setPreviewVersionId] = useState<Id<"noteVersions"> | null>(null);

  const versions = useQuery(api.versions.listVersions, { noteId }) || [];
  const previewVersion = useQuery(
    api.versions.getVersion,
    previewVersionId ? { id: previewVersionId } : "skip"
  );
  // Note: createVersion is handled in NoteEditor

  const handleRestore = async () => {
    if (!previewVersion || restoring || restoreDisabled) return;
    await onRestore(previewVersion._id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="font-semibold">Version History</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={restoring} aria-label="Close version history">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Versions list */}
          <div className="w-72 border-r flex flex-col">
            <ScrollArea className="flex-1">
              {versions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No versions yet</p>
                  <p className="text-xs mt-1">Versions are saved automatically</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {versions.map((version) => (
                    <button
                      key={version._id}
                      type="button"
                      aria-label={`Preview ${version.title || "Untitled"} version`}
                      aria-pressed={previewVersionId === version._id}
                      disabled={restoring}
                      className={`w-full p-2 text-left rounded-lg cursor-pointer transition-colors ${
                        previewVersionId === version._id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => setPreviewVersionId(version._id)}
                    >
                      <div className="font-medium text-sm truncate">
                        {version.title || "Untitled"}
                      </div>
                      <div className="text-xs opacity-70">
                        {format(new Date(version.createdAt), "MMM d, yyyy HH:mm")}
                      </div>
                      <div className="text-xs opacity-50">
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Preview pane */}
          <div className="flex-1 flex flex-col">
            {previewVersion ? (
              <>
                <div className="p-3 border-b flex items-center justify-between bg-muted/50">
                  <div>
                    <div className="font-medium">{previewVersion.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(previewVersion.createdAt), "MMMM d, yyyy 'at' HH:mm")}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" disabled={restoring || restoreDisabled}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {restoring ? "Restoring..." : "Restore"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your current draft will be saved in version history before this version replaces it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={restoring || restoreDisabled}>
                          Restore Version
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewVersion.content || "*No content*"}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose} disabled={restoring}>Close</Button>
        </div>
      </div>
    </div>
  );
}

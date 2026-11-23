"use client";

import { useState } from "react";
import Link from "next/link";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast-notification";
import { TrashView } from "@/components/TrashView";
import { TrashGroups } from "@/components/TrashGroups";
import { getRelativeTime } from "@/lib/relative-time";

type Kind = "notes" | "canvases" | "boards" | "cards";
type TrashedItem = Doc<"canvases"> | Doc<"kanbanBoards"> | Doc<"kanbanCards">;
type TrashAction = "restore" | "delete";

export function WorkspaceTrash() {
  const [kind, setKind] = useState<Kind>("notes");
  const [pending, setPending] = useState<{ id: string; action: TrashAction } | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const canvases = useQuery(api.canvases.listTrash, isAuthenticated ? {} : "skip");
  const boards = useQuery(api.kanban.listBoardTrash, isAuthenticated ? {} : "skip");
  const cards = useQuery(api.kanban.listCardTrash, isAuthenticated ? {} : "skip");
  const restoreCanvas = useMutation(api.canvases.restoreCanvas);
  const restoreBoard = useMutation(api.kanban.restoreBoard);
  const restoreCard = useMutation(api.kanban.restoreCard);
  const deleteCanvas = useMutation(api.canvases.deleteCanvas);
  const deleteBoard = useMutation(api.kanban.permanentDeleteBoard);
  const { error, success } = useToast();
  const records = kind === "canvases" ? canvases : kind === "boards" ? boards : cards;

  async function handleAction(record: TrashedItem, action: TrashAction) {
    if (pending) return;
    setPending({ id: record._id, action });
    try {
      if (action === "delete") {
        if ("content" in record) await deleteCanvas({ id: record._id });
        else if (!("columnId" in record)) await deleteBoard({ id: record._id });
        else return;
      } else if ("content" in record) {
        await restoreCanvas({ id: record._id });
      } else if ("columnId" in record) {
        await restoreCard({ id: record._id });
      } else {
        await restoreBoard({ id: record._id });
      }
      success(action === "delete" ? "Permanently deleted" : "Restored to your workspace");
    } catch (cause) {
      console.error(`Failed to ${action} workspace item:`, cause);
      error(action === "delete" ? "Could not delete" : "Could not restore", cause instanceof Error ? cause.message : "Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b p-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/notes"><ArrowLeft size={15} /> Back to notes</Link>
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-semibold"><Trash2 size={18} /> Recently deleted</h1>
      </header>
      <nav aria-label="Deleted items" className="flex gap-1 overflow-x-auto border-b p-3">
        {(["notes", "canvases", "boards", "cards"] satisfies Kind[]).map((item) => (
          <Button key={item} variant={kind === item ? "secondary" : "ghost"} size="sm" aria-pressed={kind === item} onClick={() => setKind(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </nav>
      {kind === "notes" ? <TrashView /> : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="mb-5 text-sm text-muted-foreground">
            Restore an item to bring it back to your workspace. Restore a deleted board before restoring its cards.
          </p>
          {records === undefined ? <p role="status">Loading deleted items...</p> : (
            <TrashGroups<TrashedItem> items={records} kind={kind} renderItem={(record) => (
              <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4" key={record._id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{record.title || "Untitled"}</p>
                  {record.deletedAt && <p className="mt-1 text-xs text-muted-foreground">Deleted {getRelativeTime(record.deletedAt)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={pending !== null} aria-label={`Restore ${record.title || "Untitled"}`}>
                        <RotateCcw size={14} /> {pending?.id === record._id && pending.action === "restore" ? "Restoring..." : "Restore"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this {kind.slice(0, -1)}?</AlertDialogTitle>
                        <AlertDialogDescription>&quot;{record.title || "Untitled"}&quot; will be restored to your workspace.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={pending !== null} onClick={() => void handleAction(record, "restore")}>Restore</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {kind !== "cards" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={pending !== null} aria-label={`Delete ${record.title || "Untitled"} permanently`}>
                          <Trash2 size={14} /> {pending?.id === record._id && pending.action === "delete" ? "Deleting..." : "Delete permanently"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {kind === "boards" ? "board" : "canvas"} permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            &quot;{record.title || "Untitled"}&quot; will be permanently deleted.
                            {kind === "boards" ? " All its columns and tasks will also be deleted." : " Its unshared uploaded files will also be deleted."}
                            {" "}This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" disabled={pending !== null} onClick={() => void handleAction(record, "delete")}>Delete permanently</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </li>
            )} />
          )}
        </div>
      )}
    </div>
  );
}

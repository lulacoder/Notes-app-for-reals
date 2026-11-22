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

export function WorkspaceTrash() {
  const [kind, setKind] = useState<Kind>("notes");
  const [restoring, setRestoring] = useState<string | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const canvases = useQuery(
    api.canvases.listTrash,
    isAuthenticated ? {} : "skip",
  );
  const boards = useQuery(
    api.kanban.listBoardTrash,
    isAuthenticated ? {} : "skip",
  );
  const cards = useQuery(
    api.kanban.listCardTrash,
    isAuthenticated ? {} : "skip",
  );
  const restoreCanvas = useMutation(api.canvases.restoreCanvas);
  const restoreBoard = useMutation(api.kanban.restoreBoard);
  const restoreCard = useMutation(api.kanban.restoreCard);
  const { error, success } = useToast();
  const records =
    kind === "canvases" ? canvases : kind === "boards" ? boards : cards;
  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b p-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/notes">
            <ArrowLeft size={15} /> Back to notes
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Trash2 size={18} /> Recently deleted
        </h1>
      </header>
      <nav
        aria-label="Deleted items"
        className="flex gap-1 overflow-x-auto border-b p-3"
      >
        {(["notes", "canvases", "boards", "cards"] satisfies Kind[]).map(
          (item) => (
            <Button
              key={item}
              variant={kind === item ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={kind === item}
              onClick={() => setKind(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Button>
          ),
        )}
      </nav>
      {kind === "notes" ? (
        <TrashView />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="mb-5 text-sm text-muted-foreground">
            Restore an item to bring it back to your workspace. Restore a
            deleted board before restoring its cards.
          </p>
          {records === undefined ? (
            <p role="status">Loading deleted items...</p>
          ) : (
            <TrashGroups<Doc<"canvases"> | Doc<"kanbanBoards"> | Doc<"kanbanCards">> items={records} kind={kind}
              renderItem={(record) => (
                <li
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-card p-4"
                  key={record._id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.title || "Untitled"}</p>
                    {record.deletedAt && <p className="mt-1 text-xs text-muted-foreground">Deleted {getRelativeTime(record.deletedAt)}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={restoring !== null}>
                        <RotateCcw size={14} /> {restoring === record._id ? "Restoring..." : "Restore"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this {kind.slice(0, -1)}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{record.title || "Untitled"}&quot; will be restored to your workspace.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                      setRestoring(record._id);
                      try {
                        if (kind === "canvases" && "content" in record)
                          await restoreCanvas({ id: record._id });
                        else if (
                          kind === "boards" &&
                          !("columnId" in record) &&
                          !("content" in record)
                        )
                          await restoreBoard({ id: record._id });
                        else if ("columnId" in record)
                          await restoreCard({ id: record._id });
                        success("Restored to your workspace");
                      } catch (cause) {
                        console.error("Failed WorkspaceTrash action:", cause);
                        error(
                          "Could not restore",
                          cause instanceof Error ? cause.message : "Try again.",
                        );
                      } finally {
                        setRestoring(null);
                      }
                    }}>Restore</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              )} />
          )}
        </div>
      )}
    </div>
  );
}

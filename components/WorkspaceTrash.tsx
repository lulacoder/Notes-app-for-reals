"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-notification";
import { TrashView } from "@/components/TrashView";

type Kind = "notes" | "canvases" | "boards" | "cards";

export function WorkspaceTrash() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("canvases");
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
        <TrashView
          onClose={() => setKind("canvases")}
          onSelectNote={(id) => router.push(`/notes/${id}`)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="mb-5 text-sm text-muted-foreground">
            Restore an item to bring it back to your workspace. Restore a
            deleted board before restoring its cards.
          </p>
          {records === undefined ? (
            <p role="status">Loading deleted items...</p>
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No deleted {kind}.
            </p>
          ) : (
            <ul className="max-w-3xl divide-y rounded-xl border">
              {records.map((record) => (
                <li
                  className="flex items-center justify-between gap-4 p-4"
                  key={record._id}
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {record.title || "Untitled"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoring !== null}
                    onClick={async () => {
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
                        error(
                          "Could not restore",
                          cause instanceof Error ? cause.message : "Try again.",
                        );
                      } finally {
                        setRestoring(null);
                      }
                    }}
                  >
                    <RotateCcw size={14} />{" "}
                    {restoring === record._id ? "Restoring..." : "Restore"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

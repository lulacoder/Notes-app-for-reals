"use client";

import { useId, useRef, useState, type FormEvent, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";

interface CreateWorkspaceDialogProps {
  kind: "canvas" | "board";
  onCreate: (title: string) => Promise<void>;
  children: ReactElement;
}

export function CreateWorkspaceDialog({
  kind,
  onCreate,
  children,
}: CreateWorkspaceDialogProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const defaultTitle = kind === "canvas" ? "Untitled Canvas" : "Untitled Board";

  function handleOpenChange(value: boolean) {
    if (creatingRef.current) return;
    setTitle("");
    setMessage(null);
    setOpen(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setMessage(null);
    try {
      await onCreate(title.trim());
      setOpen(false);
      setTitle("");
    } catch (cause) {
      console.error(`Failed to create ${kind}:`, cause);
      setMessage(getErrorMessage(cause, "Please try again."));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={!creating}>
        <DialogHeader>
          <DialogTitle>Create {kind}</DialogTitle>
          <DialogDescription>
            Give your {kind} a title before you start.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={creating}>
          <div className="space-y-2">
            <Label htmlFor={`${id}-title`}>Title</Label>
            <Input
              id={`${id}-title`}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={defaultTitle}
              aria-describedby={`${id}-hint`}
              disabled={creating}
              autoFocus
            />
            <p id={`${id}-hint`} className="text-sm text-muted-foreground">
              Leave blank to use &ldquo;{defaultTitle}&rdquo;.
            </p>
          </div>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              Could not create {kind}. {message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={creating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : `Create ${kind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

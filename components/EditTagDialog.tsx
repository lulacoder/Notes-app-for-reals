"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-notification";
import { cn } from "@/lib/utils";

interface EditTagDialogProps {
  tag: Doc<"tags">;
  colors: ReadonlyArray<{ name: string; value: string }>;
  onClose: () => void;
}

export function EditTagDialog({ tag, colors, onClose }: EditTagDialogProps) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [saving, setSaving] = useState(false);
  const updateTag = useMutation(api.tags.updateTag);
  const { error } = useToast();

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    try {
      await updateTag({ id: tag._id, name: name.trim(), color });
      onClose();
    } catch (cause) {
      console.error("Failed to update tag:", cause);
      error("Could not update tag", cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>Edit tag</DialogTitle>
          <DialogDescription>Changes apply everywhere this tag is used.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-tag-name">Tag name</Label>
            <Input id="edit-tag-name" value={name} onChange={(event) => setName(event.target.value)} disabled={saving} required autoFocus />
          </div>
          <fieldset disabled={saving} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Color</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.name}
                  aria-pressed={color === option.value}
                  className={cn("size-7 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring", option.value, color === option.value && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
                  onClick={() => setColor(option.value)}
                />
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

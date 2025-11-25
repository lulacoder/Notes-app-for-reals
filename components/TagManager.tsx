"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Tag, X, MoreHorizontal, Trash2 } from "lucide-react";

const TAG_COLORS = [
  { name: "Red", value: "bg-red-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Amber", value: "bg-amber-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Lime", value: "bg-lime-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Emerald", value: "bg-emerald-500" },
  { name: "Teal", value: "bg-teal-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Sky", value: "bg-sky-500" },
  { name: "Blue", value: "bg-blue-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Violet", value: "bg-violet-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Fuchsia", value: "bg-fuchsia-500" },
  { name: "Pink", value: "bg-pink-500" },
];

interface TagManagerProps {
  noteId: Id<"notes">;
  noteTagIds: Id<"tags">[];
}

export function TagManager({ noteId, noteTagIds }: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[10].value);
  const tags = useQuery(api.tags.listTags) || [];
  const createTag = useMutation(api.tags.createTag);
  const deleteTag = useMutation(api.tags.deleteTag);
  const updateNoteTags = useMutation(api.notes.updateNoteTags);

  const noteTags = tags.filter((tag) => noteTagIds?.includes(tag._id));
  const availableTags = tags.filter((tag) => !noteTagIds?.includes(tag._id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tagId = await createTag({ name: newTagName.trim(), color: selectedColor });
      await updateNoteTags({ id: noteId, tagIds: [...(noteTagIds || []), tagId] });
      setNewTagName("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleAddTag = async (tagId: Id<"tags">) => {
    await updateNoteTags({ id: noteId, tagIds: [...(noteTagIds || []), tagId] });
  };

  const handleRemoveTag = async (tagId: Id<"tags">) => {
    await updateNoteTags({
      id: noteId,
      tagIds: (noteTagIds || []).filter((id) => id !== tagId),
    });
  };

  const handleDeleteTag = async (tagId: Id<"tags">) => {
    await deleteTag({ id: tagId });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Tag className="h-4 w-4" />
          <span className="hidden sm:inline">Tags</span>
          {noteTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {noteTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {/* Current tags */}
          {noteTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Current tags</div>
              <div className="flex flex-wrap gap-1.5">
                {noteTags.map((tag) => (
                  <Badge
                    key={tag._id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    <span className={`w-2 h-2 rounded-full ${tag.color}`} />
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag._id)}
                      className="ml-1 hover:bg-muted rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Add tags</div>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <div key={tag._id} className="group relative">
                    <Badge
                      variant="outline"
                      className="gap-1 cursor-pointer hover:bg-accent"
                      onClick={() => handleAddTag(tag._id)}
                    >
                      <span className={`w-2 h-2 rounded-full ${tag.color}`} />
                      {tag.name}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-muted opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <MoreHorizontal className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteTag(tag._id)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create new tag */}
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground">Create new tag</div>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              />
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`w-5 h-5 rounded-full ${color.value} ${
                    selectedColor === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Tag filter for sidebar
interface TagFilterProps {
  selectedTagId: Id<"tags"> | null;
  onSelectTag: (tagId: Id<"tags"> | null) => void;
}

export function TagFilter({ selectedTagId, onSelectTag }: TagFilterProps) {
  const tags = useQuery(api.tags.listTags) || [];

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b">
      <Badge
        variant={selectedTagId === null ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => onSelectTag(null)}
      >
        All
      </Badge>
      {tags.map((tag) => (
        <Badge
          key={tag._id}
          variant={selectedTagId === tag._id ? "default" : "outline"}
          className="cursor-pointer gap-1"
          onClick={() => onSelectTag(tag._id)}
        >
          <span className={`w-2 h-2 rounded-full ${tag.color}`} />
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

// Simple tag assigner for NoteEditor toolbar
interface TagAssignerProps {
  selectedTagIds: Id<"tags">[];
  onUpdateTags: (tagIds: Id<"tags">[]) => void;
}

export function TagAssigner({ selectedTagIds, onUpdateTags }: TagAssignerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[10].value);

  const tags = useQuery(api.tags.listTags) || [];
  const createTag = useMutation(api.tags.createTag);

  const handleToggleTag = (tagId: Id<"tags">) => {
    if (selectedTagIds.includes(tagId)) {
      onUpdateTags(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onUpdateTags([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tagId = await createTag({ name: newTagName.trim(), color: selectedColor });
      onUpdateTags([...selectedTagIds, tagId]);
      setNewTagName("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          title="Manage tags"
        >
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Tags</div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag._id}
                  variant={selectedTagIds.includes(tag._id) ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                  onClick={() => handleToggleTag(tag._id)}
                >
                  <span className={`w-2 h-2 rounded-full ${tag.color}`} />
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags yet</p>
          )}

          {/* Create new tag */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="New tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              />
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.slice(0, 8).map((color) => (
                <button
                  key={color.value}
                  className={`w-4 h-4 rounded-full ${color.value} ${
                    selectedColor === color.value ? "ring-2 ring-offset-1 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

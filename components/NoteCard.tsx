"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { motion } from "framer-motion";
import { getRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: {
    _id: Id<"notes">;
    title: string;
    content: string;
    updatedAt: number;
    isPinned?: boolean;
    tagIds?: Id<"tags">[];
  };
  tags: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
  }>;
  isSelected: boolean;
  onClick: () => void;
}

export function NoteCard({ note, tags, isSelected, onClick }: NoteCardProps) {
  // Extract preview text from HTML content
  const getPreviewText = (html: string): string => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return text.trim().substring(0, 150);
  };

  // Extract first image from content for thumbnail
  const getThumbnail = (html: string): string | null => {
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch ? imgMatch[1] : null;
  };

  const noteTags = (note.tagIds || [])
    .map((tagId) => tags.find((t) => t._id === tagId))
    .filter(Boolean);

  const preview = getPreviewText(note.content);
  const thumbnail = getThumbnail(note.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-card p-4 transition-all duration-200",
        "hover:shadow-lg hover:border-primary/20",
        isSelected && "ring-2 ring-primary border-primary/50 shadow-md"
      )}
    >
      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute -top-2 -right-2 z-10">
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            className="bg-amber-500 text-white p-1.5 rounded-full shadow-md"
          >
            <Pin className="h-3 w-3 fill-current" />
          </motion.div>
        </div>
      )}

      {/* Thumbnail */}
      {thumbnail && (
        <div className="mb-3 -mx-1 -mt-1 rounded-lg overflow-hidden aspect-video bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h3 className="font-semibold text-base mb-1 truncate group-hover:text-primary transition-colors">
        {note.title || "Untitled"}
      </h3>

      {/* Preview text */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
        {preview || "Empty note"}
      </p>

      {/* Footer: Tags + Date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          {noteTags.slice(0, 2).map((tag) => (
            <Badge
              key={tag!._id}
              className={cn(tag!.color, "text-white text-[10px] px-1.5 py-0")}
            >
              {tag!.name}
            </Badge>
          ))}
          {noteTags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{noteTags.length - 2}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {getRelativeTime(note.updatedAt)}
        </span>
      </div>
    </motion.div>
  );
}

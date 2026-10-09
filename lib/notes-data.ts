import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { extractFirstImageSrc, stripHtmlToText } from "@/lib/html-utils";

export type NotesQuery = typeof api.notes.listNoteSummaries | typeof api.notes.listNotes;
export type TrashCountQuery = typeof api.notes.countTrash | typeof api.notes.listTrash;
export type PreloadedNotes = Preloaded<NotesQuery>;
export type PreloadedTrashCount = Preloaded<TrashCountQuery>;

export function getNoteSummaries(notes: FunctionReturnType<NotesQuery>) {
  return notes.map((note) => {
    if (!("content" in note)) return note;
    const searchText = stripHtmlToText(note.content);
    return {
      _id: note._id, title: note.title, updatedAt: note.updatedAt,
      isPinned: note.isPinned, tagIds: note.tagIds,
      preview: searchText.substring(0, 150), searchText,
      thumbnail: note.thumbnail ?? extractFirstImageSrc(note.content),
    };
  });
}

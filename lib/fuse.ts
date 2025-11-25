import Fuse from "fuse.js";

export interface NoteSearchItem {
  _id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export function createNotesSearchIndex(notes: NoteSearchItem[]) {
  return new Fuse(notes, {
    keys: [
      { name: "title", weight: 2 },
      { name: "content", weight: 1 },
    ],
    threshold: 0.3,
    includeScore: true,
    ignoreLocation: true,
  });
}

export function searchNotes(
  fuse: Fuse<NoteSearchItem>,
  query: string
): NoteSearchItem[] {
  if (!query.trim()) {
    return [];
  }
  return fuse.search(query).map((result) => result.item);
}

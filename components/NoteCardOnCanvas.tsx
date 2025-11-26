"use client";

import {
  BaseBoxShapeUtil,
  DefaultColorStyle,
  HTMLContainer,
  RecordProps,
  T,
  TLBaseShape,
  TLDefaultColorStyle,
  createShapeId,
} from "@tldraw/tldraw";
import { FileText } from "lucide-react";

// Define the shape type for note cards
export type NoteCardShape = TLBaseShape<
  "note-card",
  {
    w: number;
    h: number;
    noteId: string;
    noteTitle: string;
    notePreview: string;
    color: TLDefaultColorStyle;
  }
>;

// Shape utility class for rendering and behavior
export class NoteCardShapeUtil extends BaseBoxShapeUtil<NoteCardShape> {
  static override type = "note-card" as const;

  static override props: RecordProps<NoteCardShape> = {
    w: T.number,
    h: T.number,
    noteId: T.string,
    noteTitle: T.string,
    notePreview: T.string,
    color: DefaultColorStyle,
  };

  override getDefaultProps(): NoteCardShape["props"] {
    return {
      w: 280,
      h: 160,
      noteId: "",
      noteTitle: "Untitled Note",
      notePreview: "",
      color: "yellow",
    };
  }

  override component(shape: NoteCardShape) {
    const { noteTitle, notePreview, color } = shape.props;

    // Map tldraw colors to CSS classes
    const colorMap: Record<string, string> = {
      yellow: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
      blue: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
      green: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
      red: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
      orange: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
      violet: "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700",
      grey: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
      black: "bg-gray-900 dark:bg-gray-950 border-gray-700 text-white",
      white: "bg-white dark:bg-gray-100 border-gray-200 dark:text-gray-900",
      "light-blue": "bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700",
      "light-green": "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
      "light-red": "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700",
      "light-violet": "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
    };

    const colorClass = colorMap[color] || colorMap.yellow;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <div
          className={`w-full h-full rounded-xl border-2 shadow-lg overflow-hidden flex flex-col cursor-pointer transition-shadow hover:shadow-xl ${colorClass}`}
          onDoubleClick={() => {
            // Navigate to note on double click
            if (shape.props.noteId) {
              // Dispatch custom event that the parent can listen to
              window.dispatchEvent(
                new CustomEvent("open-note", {
                  detail: { noteId: shape.props.noteId },
                })
              );
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
            <FileText className="h-4 w-4 shrink-0 opacity-70" />
            <span className="font-medium text-sm truncate flex-1">
              {noteTitle || "Untitled Note"}
            </span>
          </div>

          {/* Preview content */}
          <div className="flex-1 px-3 py-2 overflow-hidden">
            <p className="text-xs text-muted-foreground line-clamp-5 whitespace-pre-wrap">
              {notePreview || "No content"}
            </p>
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground/60 border-t border-inherit">
            Double-click to open
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: NoteCardShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={12}
        ry={12}
      />
    );
  }
}

// Helper function to create a note card shape
export function createNoteCardShape(
  noteId: string,
  noteTitle: string,
  noteContent: string,
  x: number = 0,
  y: number = 0
) {
  // Extract first ~200 chars for preview
  const preview = noteContent
    .replace(/^#+ /gm, "") // Remove markdown headers
    .replace(/\*\*/g, "") // Remove bold
    .replace(/\*/g, "") // Remove italic
    .replace(/`/g, "") // Remove code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links with text
    .slice(0, 200);

  return {
    id: createShapeId(),
    type: "note-card" as const,
    x,
    y,
    props: {
      w: 280,
      h: 160,
      noteId,
      noteTitle,
      notePreview: preview,
      color: "yellow" as TLDefaultColorStyle,
    },
  };
}

// Custom shapes array for registering with tldraw
export const customShapes = [NoteCardShapeUtil];
